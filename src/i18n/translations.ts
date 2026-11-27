// Multi-language localization dictionary for The Fugitive
// Supports English (default), Spanish, Catalan, French, and Japanese.

export type SupportedLanguage = 'en' | 'es' | 'ca' | 'fr' | 'ja';

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: 'English (Default)',
  es: 'Español (Spanish)',
  ca: 'Català (Catalan)',
  fr: 'Français (French)',
  ja: '日本語 (Japanese)',
};

export interface TranslationDictionary {
  nav: {
    home: string;
    play: string;
    profile: string;
    stats: string;
    shop: string;
    rewards: string;
    settings: string;
    shortHome: string;
    shortPlay: string;
    shortProfile: string;
    shortStats: string;
    shortShop: string;
    shortRewards: string;
    shortSettings: string;
  };
  home: {
    proclamation: string;
    title: string;
    subtitle: string;
    enterChamber: string;
    startTutorial: string;
    joinCardTitle: string;
    profileCardTitle: string;
    rewardsCardTitle: string;
    factionsDivider: string;
  };
  settings: {
    title: string;
    subtitle: string;
    audioSection: string;
    masterAudio: string;
    musicToggle: string;
    sfxToggle: string;
    testSfx: string;
    notificationsSection: string;
    notifMaster: string;
    notifLobby: string;
    notifPhases: string;
    notifEvents: string;
    notifRewards: string;
    accessibilitySection: string;
    reducedMotion: string;
    fontSize: string;
    highContrast: string;
    compactMode: string;
    languageSection: string;
    languageLabel: string;
    resetDefaults: string;
  };
  tutorial: {
    title: string;
    subtitle: string;
    previous: string;
    next: string;
    finish: string;
    stepOf: string;
    openGuide: string;
  };
}

export const TRANSLATIONS: Record<SupportedLanguage, TranslationDictionary> = {
  en: {
    nav: {
      home: 'Chronicle',
      play: 'Secret Chamber',
      profile: 'Dossier',
      stats: 'Archives',
      shop: 'Merchant',
      rewards: 'Daily Fealty',
      settings: 'Ledger Settings',
      shortHome: 'Home',
      shortPlay: 'Play',
      shortProfile: 'Profile',
      shortStats: 'Stats',
      shortShop: 'Shop',
      shortRewards: 'Rewards',
      shortSettings: 'Settings',
    },
    home: {
      proclamation: 'Royal Proclamation • Year of the Hunt',
      title: 'The Hunt For The Fugitive',
      subtitle:
        'Four clandestine factions search the realm. One solitary quarry hides in the shadows of the village. Trust no whisper, weigh every accusation, and may the truth illuminate your path.',
      enterChamber: 'Enter Secret Chamber',
      startTutorial: 'Interactive Guide',
      joinCardTitle: 'Join a Chamber',
      profileCardTitle: 'Personal Dossier',
      rewardsCardTitle: 'Daily Fealty Ledger',
      factionsDivider: 'The Factions of the Realm',
    },
    settings: {
      title: 'Manuscript & Device Settings',
      subtitle: 'Configure audio cues, notifications, accessibility, language, and device preferences.',
      audioSection: 'Audio & Acoustic Cues',
      masterAudio: 'Master Audio',
      musicToggle: 'Ambient Chamber Drone',
      sfxToggle: 'Bell & Wax-Seal Sound Effects',
      testSfx: 'Test Sound Cue',
      notificationsSection: 'Notifications & Alerts',
      notifMaster: 'Enable In-App Notifications',
      notifLobby: 'Match Invites & Lobby Updates',
      notifPhases: 'Match Start & Day/Night Transitions',
      notifEvents: 'Privacy-Filtered Game Events',
      notifRewards: 'Rewards, Level-Ups & Achievements',
      accessibilitySection: 'Accessibility & Readability',
      reducedMotion: 'Reduced Motion',
      fontSize: 'Typography Scale',
      highContrast: 'High-Contrast Focus & Borders',
      compactMode: 'Compact Interface Density',
      languageSection: 'Language & Localization',
      languageLabel: 'Interface Language',
      resetDefaults: 'Restore Default Settings',
    },
    tutorial: {
      title: 'Initiate’s Chronicle & Field Guide',
      subtitle: 'Learn the laws of the realm without revealing any secret match intelligence.',
      previous: 'Previous Chapter',
      next: 'Next Chapter',
      finish: 'Complete Training',
      stepOf: 'Chapter',
      openGuide: 'Field Guide',
    },
  },
  es: {
    nav: {
      home: 'Crónica',
      play: 'Cámara Secreta',
      profile: 'Expediente',
      stats: 'Archivos',
      shop: 'Mercader',
      rewards: 'Lealtad Diaria',
      settings: 'Ajustes',
      shortHome: 'Inicio',
      shortPlay: 'Jugar',
      shortProfile: 'Perfil',
      shortStats: 'Stats',
      shortShop: 'Tienda',
      shortRewards: 'Premios',
      shortSettings: 'Ajustes',
    },
    home: {
      proclamation: 'Proclamación Real • Año de la Caza',
      title: 'La Caza del Fugitivo',
      subtitle:
        'Cuatro facciones clandestinas registran el reino. Una presa solitaria se oculta entre las sombras de la aldea. No confíes en ningún susurro y busca la verdad.',
      enterChamber: 'Entrar a la Cámara',
      startTutorial: 'Guía Interactiva',
      joinCardTitle: 'Unirse a una Cámara',
      profileCardTitle: 'Expediente Personal',
      rewardsCardTitle: 'Libro de Lealtad Diaria',
      factionsDivider: 'Las Facciones del Reino',
    },
    settings: {
      title: 'Ajustes del Manuscrito y Dispositivo',
      subtitle: 'Configura audio, notificaciones, accesibilidad, idioma y preferencias de interfaz.',
      audioSection: 'Audio y Señales Acústicas',
      masterAudio: 'Audio Maestro',
      musicToggle: 'Música Ambiental de Cámara',
      sfxToggle: 'Efectos de Sonido y Campanas',
      testSfx: 'Probar Sonido',
      notificationsSection: 'Notificaciones y Alertas',
      notifMaster: 'Activar Notificaciones',
      notifLobby: 'Invitaciones y Cambios en Sala',
      notifPhases: 'Inicio de Partida y Día/Noche',
      notifEvents: 'Eventos Privados de Partida',
      notifRewards: 'Recompensas, Niveles y Logros',
      accessibilitySection: 'Accesibilidad y Lectura',
      reducedMotion: 'Movimiento Reducido',
      fontSize: 'Tamaño de Tipografía',
      highContrast: 'Bordes y Foco de Alto Contraste',
      compactMode: 'Densidad Compacta',
      languageSection: 'Idioma y Localización',
      languageLabel: 'Idioma de la Interfaz',
      resetDefaults: 'Restaurar Valores por Defecto',
    },
    tutorial: {
      title: 'Crónica del Iniciado y Guía de Campo',
      subtitle: 'Aprende las leyes del reino sin revelar información secreta de partidas.',
      previous: 'Capítulo Anterior',
      next: 'Siguiente Capítulo',
      finish: 'Completar Entrenamiento',
      stepOf: 'Capítulo',
      openGuide: 'Guía',
    },
  },
  ca: {
    nav: {
      home: 'Crònica',
      play: 'Cambra Secreta',
      profile: 'Expedient',
      stats: 'Arxius',
      shop: 'Mercader',
      rewards: 'Lleialtat Diària',
      settings: 'Configuració',
      shortHome: 'Inici',
      shortPlay: 'Jugar',
      shortProfile: 'Perfil',
      shortStats: 'Stats',
      shortShop: 'Botiga',
      shortRewards: 'Premis',
      shortSettings: 'Ajustos',
    },
    home: {
      proclamation: 'Proclamació Reial • Any de la Cacera',
      title: 'La Cacera del Fugitiu',
      subtitle:
        'Quatre faccions clandestines escorcollen el regne. Una presa solitària s’amaga entre les ombres del poble. No et refiïs de cap xiuxiueig.',
      enterChamber: 'Entrar a la Cambra',
      startTutorial: 'Guia Interactiva',
      joinCardTitle: 'Unir-se a una Cambra',
      profileCardTitle: 'Expedient Personal',
      rewardsCardTitle: 'Llibre de Lleialtat Diària',
      factionsDivider: 'Les Faccions del Regne',
    },
    settings: {
      title: 'Configuració del Manuscrit i Dispositiu',
      subtitle: 'Configura àudio, notificacions, accessibilitat, idioma i preferències.',
      audioSection: 'Àudio i Senyals Acústics',
      masterAudio: 'Àudio Principal',
      musicToggle: 'Música Ambiental',
      sfxToggle: 'Efectes de So i Campanes',
      testSfx: 'Provar So',
      notificationsSection: 'Notificacions i Alertes',
      notifMaster: 'Activar Notificacions',
      notifLobby: 'Invitacions i Canvis de Sala',
      notifPhases: 'Inici de Partida i Dia/Nit',
      notifEvents: 'Esdeveniments Filtrats per Rol',
      notifRewards: 'Recompenses, Nivells i Fites',
      accessibilitySection: 'Accessibilitat i Lectura',
      reducedMotion: 'Moviment Reduït',
      fontSize: 'Mida de Tipografia',
      highContrast: 'Contrast Alt i Focus Visible',
      compactMode: 'Densitat Compacta',
      languageSection: 'Idioma i Localització',
      languageLabel: 'Idioma de la Interfície',
      resetDefaults: 'Restablir per Defecte',
    },
    tutorial: {
      title: 'Crònica de l’Iniciat i Guia de Camp',
      subtitle: 'Aprèn les regles del regne sense revelar informació secreta.',
      previous: 'Capítol Anterior',
      next: 'Capítol Següent',
      finish: 'Completar Formació',
      stepOf: 'Capítol',
      openGuide: 'Guia',
    },
  },
  fr: {
    nav: {
      home: 'Chronique',
      play: 'Chambre Secrète',
      profile: 'Dossier',
      stats: 'Archives',
      shop: 'Marchand',
      rewards: 'Allégeance',
      settings: 'Paramètres',
      shortHome: 'Accueil',
      shortPlay: 'Jouer',
      shortProfile: 'Profil',
      shortStats: 'Stats',
      shortShop: 'Boutique',
      shortRewards: 'Dons',
      shortSettings: 'Réglages',
    },
    home: {
      proclamation: 'Proclamation Royale • An de la Traque',
      title: 'La Traque du Fugitif',
      subtitle:
        'Quatre factions clandestines fouillent le royaume. Une proie solitaire se cache dans l’ombre du village. Ne croyez aucun murmure.',
      enterChamber: 'Entrer dans la Chambre',
      startTutorial: 'Guide Interactif',
      joinCardTitle: 'Rejoindre une Chambre',
      profileCardTitle: 'Dossier Personnel',
      rewardsCardTitle: 'Registre d’Allégeance',
      factionsDivider: 'Les Factions du Royaume',
    },
    settings: {
      title: 'Paramètres du Manuscrit et Appareil',
      subtitle: 'Configurez l’audio, les notifications, l’accessibilité, la langue et l’interface.',
      audioSection: 'Audio et Signaux Sonores',
      masterAudio: 'Audio Principal',
      musicToggle: 'Ambiance de la Chambre',
      sfxToggle: 'Effets Sonores et Cloches',
      testSfx: 'Tester le Son',
      notificationsSection: 'Notifications et Alertes',
      notifMaster: 'Activer les Notifications',
      notifLobby: 'Invitations et Salon',
      notifPhases: 'Début de Partie et Jour/Nuit',
      notifEvents: 'Événements Filtrés par Rôle',
      notifRewards: 'Récompenses, Niveaux et Hauts Faits',
      accessibilitySection: 'Accessibilité et Lisibilité',
      reducedMotion: 'Mouvement Réduit',
      fontSize: 'Taille de Police',
      highContrast: 'Contraste Élevé et Focus',
      compactMode: 'Densité Compacte',
      languageSection: 'Langue et Localisation',
      languageLabel: 'Langue de l’Interface',
      resetDefaults: 'Rétablir par Défaut',
    },
    tutorial: {
      title: 'Chronique de l’Initié et Guide',
      subtitle: 'Découvrez les règles sans révéler aucune information secrète.',
      previous: 'Chapitre Précédent',
      next: 'Chapitre Suivant',
      finish: 'Terminer la Formation',
      stepOf: 'Chapitre',
      openGuide: 'Guide',
    },
  },
  ja: {
    nav: {
      home: '年代記',
      play: '秘密の部屋',
      profile: '記録書',
      stats: '戦績書庫',
      shop: '商人',
      rewards: '日次忠誠',
      settings: '設定',
      shortHome: 'ホーム',
      shortPlay: '対戦',
      shortProfile: '記録',
      shortStats: '戦績',
      shortShop: '商店',
      shortRewards: '報酬',
      shortSettings: '設定',
    },
    home: {
      proclamation: '王室布告 • 追跡の年',
      title: '逃亡者追跡戦',
      subtitle:
        '4つの秘密組織が王国を捜索する。1人の逃亡者が村の影に潜む。囁きを信じず、あらゆる告発を見極めよ。',
      enterChamber: '秘密の部屋へ',
      startTutorial: 'チュートリアル',
      joinCardTitle: '部屋に参加',
      profileCardTitle: '個人記録書',
      rewardsCardTitle: '日次忠誠台帳',
      factionsDivider: '王国の派閥',
    },
    settings: {
      title: '羊皮紙とデバイスの設定',
      subtitle: '音声、通知、アクセシビリティ、言語、UI設定を構成します。',
      audioSection: 'オーディオと効果音',
      masterAudio: 'マスター音量',
      musicToggle: 'アンビエントBGM',
      sfxToggle: '通知・効果音',
      testSfx: 'テスト再生',
      notificationsSection: '通知とアラート',
      notifMaster: 'アプリ内通知を有効化',
      notifLobby: '招待・ロビー更新',
      notifPhases: '試合開始・昼夜フェーズ切替',
      notifEvents: '権限に応じたイベント通知',
      notifRewards: '報酬・レベルアップ・実績',
      accessibilitySection: 'アクセシビリティ',
      reducedMotion: 'モーションを軽減',
      fontSize: '文字サイズ',
      highContrast: 'ハイコントラスト表示',
      compactMode: 'コンパクト表示',
      languageSection: '言語設定',
      languageLabel: '表示言語',
      resetDefaults: '初期設定に戻す',
    },
    tutorial: {
      title: '入門者の年代記・ガイド',
      subtitle: '秘密情報を漏らさずにゲームのルールを学びましょう。',
      previous: '前の章',
      next: '次の章',
      finish: 'チュートリアル完了',
      stepOf: '章',
      openGuide: 'ガイド',
    },
  },
};
