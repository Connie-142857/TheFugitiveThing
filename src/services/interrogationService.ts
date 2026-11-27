// Detective Interrogation & Structured Question Validator for The Fugitive
// Complies strictly with the original rulebook interrogation and crime rules.

import type {
  InterrogationQuestion,
  InterrogationRecord,
  InterrogationAnswer,
  PlayerInMatch,
  GameEvent,
} from '../types/game.ts';
import type { TeamId } from '../types/rules.ts';
import { TEAMS } from '../types/rules.ts';
import { GameEventFactory, cleanFirestoreObject } from './gameEventManager.ts';
import { doc, getDoc, updateDoc, arrayUnion, runTransaction } from 'firebase/firestore';
import { db } from '../firebase/config.ts';
import { sendSystemChatAnnouncement } from './chatService.ts';

export interface InterrogationValidationResult {
  record: InterrogationRecord;
  isLie: boolean;
  targetKilled: boolean;
  crimeCommitted: boolean;
  event?: GameEvent;
}

/**
 * Generates structured questions for Detective interrogation:
 * - "Does Player X belong to the Investigators?"
 * - "Does Player X belong to the Annihilators?"
 * - "Does Player X belong to the Communists?"
 * - "Does Player X belong to the Soldiers?"
 */
export function generateStructuredQuestions(
  subjectUid: string,
  subjectName: string,
  availableTeams: TeamId[] = ['investigators', 'annihilators', 'communists', 'soldiers']
): InterrogationQuestion[] {
  return availableTeams.map((teamId) => {
    const teamName = TEAMS[teamId]?.name || teamId;
    return {
      id: `q_${subjectUid}_${teamId}`,
      subjectUid,
      subjectName,
      queriedTeam: teamId,
      questionText: `Does citizen ${subjectName} belong to the ${teamName}?`,
    };
  });
}

/**
 * Initiates an interrogation session for the Detective
 */
export function createInterrogationSession(
  round: number,
  detectiveUid: string,
  target: PlayerInMatch,
  subject: PlayerInMatch,
  queriedTeams: TeamId[] = ['investigators', 'annihilators', 'communists']
): InterrogationRecord {
  const questions = generateStructuredQuestions(subject.uid, subject.username, queriedTeams).slice(0, 3);

  return {
    id: `interr_${Date.now()}_${target.uid}`,
    round,
    detectiveUid,
    targetUid: target.uid,
    targetName: target.username,
    questions: questions.map((q) => ({
      question: q,
      answer: undefined,
      isLie: undefined,
      answeredAt: undefined,
    })),
    completed: false,
    lieDetected: false,
    penaltyInflicted: undefined,
  };
}

/**
 * Validates whether the interrogated target player actually possesses knowledge
 * of the subject's true faction:
 * - If target is in the SAME team as subject -> target KNOWS.
 * - If target IS the subject -> target KNOWS.
 * - Otherwise -> target does NOT know with certainty.
 */
export function doesPlayerKnowTeam(
  target: PlayerInMatch,
  subject: PlayerInMatch
): boolean {
  if (target.uid === subject.uid) return true;
  if (target.team && subject.team && target.team === subject.team) return true;
  return false;
}

/**
 * Evaluates an interrogation answer according to rulebook truth and lie invariants:
 * 1. If target knows the answer:
 *    - False answer is a lie.
 *    - "I don't know" counts as a lie.
 * 2. If target does NOT know the answer:
 *    - "I don't know" is NOT a lie.
 *    - A guess is evaluated against ground truth.
 *
 * Consequences of lying:
 * - A lie commits a crime.
 * - If target already has a crime, Detective executes target on the spot!
 */
export function evaluateInterrogationAnswer(
  session: InterrogationRecord,
  questionIndex: number,
  answer: InterrogationAnswer,
  target: PlayerInMatch,
  subject: PlayerInMatch,
  now: number = Date.now()
): InterrogationValidationResult {
  if (questionIndex < 0 || questionIndex >= session.questions.length) {
    throw new Error('Question index out of bounds for interrogation session.');
  }

  const qItem = session.questions[questionIndex];
  const q = qItem.question;

  const targetKnows = doesPlayerKnowTeam(target, subject);
  const isSubjectActuallyInTeam = subject.team === q.queriedTeam;
  const truthAnswer: InterrogationAnswer = isSubjectActuallyInTeam ? 'yes' : 'no';

  let isLie = false;

  if (targetKnows) {
    // Player knows the truth!
    if (answer === 'dont_know') {
      isLie = true; // Claiming ignorance when knowing is a lie
    } else {
      isLie = answer !== truthAnswer;
    }
  } else {
    // Player does not know for certain
    if (answer === 'dont_know') {
      isLie = false; // "I don't know" is truthful when ignorant
    } else {
      // Guessing: if it contradicts ground truth, it's considered an untruthful assertion
      isLie = answer !== truthAnswer;
    }
  }

  qItem.answer = answer;
  qItem.isLie = isLie;
  qItem.answeredAt = now;

  let targetKilled = false;
  let crimeCommitted = false;
  let event: GameEvent | undefined = undefined;

  if (isLie) {
    session.lieDetected = true;

    // Check crime history
    if ((target.crimes || 0) > 0) {
      // Already has a crime: executed by Detective!
      target.isAlive = false;
      targetKilled = true;
      session.penaltyInflicted = 'execution';

      event = GameEventFactory.playerKilled(
        session.round,
        'day',
        target.uid,
        target.username,
        'Executed by the Detective for lying while carrying an existing Crime'
      );
    } else {
      // First crime: incur crime penalty
      target.crimes = (target.crimes || 0) + 1;
      crimeCommitted = true;
      session.penaltyInflicted = 'crime';

      event = GameEventFactory.crimeCommitted(
        session.round,
        'day',
        target.uid,
        target.username,
        'Perjury during Detective Interrogation'
      );
    }
  }

  // Check if session completed (all answered or target was killed)
  const allAnswered = session.questions.every((item) => item.answer !== undefined);
  if (allAnswered || targetKilled) {
    session.completed = true;
  }

  return {
    record: session,
    isLie,
    targetKilled,
    crimeCommitted,
    event,
  };
}

/**
 * Initiates an interrogation session in Firestore:
 * Writes activeInterrogation to the room so the target player immediately receives
 * the prompt on their screen/phone in real-time.
 */
export async function initiateDetectiveInterrogationInFirestore(
  roomId: string,
  detectiveUid: string,
  targetUid: string,
  subjectUid?: string
): Promise<{ success: boolean; session?: InterrogationRecord; error?: string }> {
  const roomRef = doc(db, 'rooms', roomId);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) {
    throw new Error('Chamber does not exist.');
  }

  const room = roomSnap.data() as any;

  if (room.phase !== 'day') {
    throw new Error('The Detective may only interrogate suspects during the Day phase.');
  }

  const detective = room.matchPlayers?.[detectiveUid] || room.players?.[detectiveUid];
  if (!detective || !detective.isAlive) {
    throw new Error('You are not alive to conduct an interrogation.');
  }

  const target = room.matchPlayers?.[targetUid] || room.players?.[targetUid];
  if (!target || !target.isAlive) {
    throw new Error('The chosen suspect is not alive.');
  }

  if (targetUid === detectiveUid) {
    throw new Error('You cannot interrogate yourself.');
  }

  // Check if an interrogation is already active and pending
  if (
    room.activeInterrogation &&
    !room.activeInterrogation.completed &&
    room.activeInterrogation.targetUid === targetUid
  ) {
    throw new Error(`${target.username} is already undergoing an active inquisition.`);
  }

  const currentRound = room.round || 1;
  const currentPhase = room.phase || 'day';
  const usageRecord = room.actionUsageByPlayer?.[detectiveUid];
  const usedCount =
    usageRecord && usageRecord.round === currentRound && usageRecord.phase === currentPhase
      ? usageRecord.count
      : 0;
  const allowedCount = 1 + (detective.statusEffects?.extraAbilityUses || 0);
  if (usedCount >= allowedCount) {
    throw new Error('You have already enacted your decree for this phase.');
  }

  // Subject is the person being asked about. If not specified or same as target, pick another player or target themselves
  const candidates = Object.values(room.matchPlayers || room.players || {}).filter(
    (p: any) => p.isAlive && p.uid !== detectiveUid
  );
  let subject = subjectUid ? room.matchPlayers?.[subjectUid] || room.players?.[subjectUid] : null;
  if (!subject) {
    subject = candidates.find((c: any) => c.uid !== targetUid) || target;
  }

  const session = createInterrogationSession(
    currentRound,
    detectiveUid,
    target,
    subject,
    ['investigators', 'annihilators', 'communists']
  );

  await updateDoc(roomRef, {
    activeInterrogation: cleanFirestoreObject(session),
    [`actionUsageByPlayer.${detectiveUid}`]: {
      round: currentRound,
      phase: currentPhase,
      count: usedCount + 1,
    },
    updatedAt: Date.now(),
  });

  // Announce summons in chat
  await sendSystemChatAnnouncement(
    roomId,
    'global',
    'global',
    `⚖️ High Inquisition: The Detective has formally summoned ${target.username} for daytime interrogation! Answer before the Tribunal promptly.`
  );

  return { success: true, session };
}

/**
 * Submits answers to an active interrogation in Firestore:
 * Evaluates truth/lies according to ground truth, records perjury/crimes,
 * carries out instant execution if lying with prior crime, and notifies all participants.
 */
export async function submitInterrogationAnswersInFirestore(
  roomId: string,
  responderUid: string,
  answers: Record<number, InterrogationAnswer>
): Promise<{ success: boolean; result?: InterrogationValidationResult; error?: string }> {
  const roomRef = doc(db, 'rooms', roomId);
  const now = Date.now();

  const finalResult = await runTransaction(db, async (transaction) => {
    const roomSnap = await transaction.get(roomRef);
    if (!roomSnap.exists()) {
      throw new Error('Chamber does not exist.');
    }

    const room = roomSnap.data() as any;
    const session: InterrogationRecord = room.activeInterrogation;

    if (!session || session.completed) {
      throw new Error('No active interrogation found requiring your testimony.');
    }

    if (session.targetUid !== responderUid) {
      throw new Error('You are not the designated subject of this inquisition.');
    }

    const target: PlayerInMatch = room.matchPlayers?.[responderUid] || room.players?.[responderUid];
    const subjectUid = session.questions[0]?.question.subjectUid || responderUid;
    const subject: PlayerInMatch = room.matchPlayers?.[subjectUid] || room.players?.[subjectUid];

    if (!target) {
      throw new Error('Target player record not found.');
    }

    let overallLie = false;
    let targetKilled = false;
    let crimeCommitted = false;
    const generatedEvents: any[] = [];

    // Evaluate each question
    for (let i = 0; i < session.questions.length; i++) {
      const ans = answers[i] || 'dont_know';
      const evalRes = evaluateInterrogationAnswer(session, i, ans, target, subject, now);
      if (evalRes.isLie) {
        overallLie = true;
      }
      if (evalRes.targetKilled) {
        targetKilled = true;
      }
      if (evalRes.crimeCommitted) {
        crimeCommitted = true;
      }
      if (evalRes.event) {
        generatedEvents.push(evalRes.event);
      }
      if (targetKilled) {
        break;
      }
    }

    session.completed = true;
    session.lieDetected = overallLie;

    const updates: Record<string, any> = {
      activeInterrogation: cleanFirestoreObject(session),
      updatedAt: now,
    };

    if (crimeCommitted) {
      updates[`matchPlayers.${target.uid}.crimes`] = target.crimes || 0;
    }

    if (targetKilled) {
      updates[`matchPlayers.${target.uid}.isAlive`] = false;
      updates[`matchPlayers.${target.uid}.status`] = 'dead';
      if (room.players?.[target.uid]) {
        updates[`players.${target.uid}.isAlive`] = false;
        updates[`players.${target.uid}.status`] = 'dead';
      }
    }

    if (generatedEvents.length > 0) {
      updates.events = arrayUnion(...generatedEvents.map((e) => cleanFirestoreObject(e)));
    }

    transaction.update(roomRef, updates);

    return {
      success: true,
      result: {
        record: session,
        isLie: overallLie,
        targetKilled,
        crimeCommitted,
      },
    };
  });

  // Post announcement of interrogation conclusion
  try {
    if (finalResult.result?.targetKilled) {
      await sendSystemChatAnnouncement(
        roomId,
        'global',
        'global',
        `💀 Immediate Execution! ${finalResult.result.record.targetName} committed perjury during the Detective's interrogation while carrying a prior crime, and was struck down!`
      );
    } else if (finalResult.result?.crimeCommitted) {
      await sendSystemChatAnnouncement(
        roomId,
        'global',
        'global',
        `⚖️ Perjury Detected! The Tribunal detected a falsehood in ${finalResult.result.record.targetName}'s testimony. A Crime has been marked against their record!`
      );
    } else {
      await sendSystemChatAnnouncement(
        roomId,
        'global',
        'global',
        `⚖️ The Detective concluded the inquiry of ${finalResult.result.record.targetName}. The testimony was recorded with no perjury detected.`
      );
    }
  } catch (err) {
    console.error('Failed to post announcement:', err);
  }

  return finalResult;
}
