/**
 * Episodio 01 — Misterios del Perú (5-6 minutos):
 * "La Puerta de Hayu Marca: El Portal de Piedra de Puno y el Lago Titicaca"
 */
(() => {
  const mk = (
    id,
    duration,
    bg,
    mood,
    sfx,
    titleCard,
    caption,
    actors,
    overlayProps = [],
    camera = { zoomStart: 1.0, zoomEnd: 1.12, orbitStart: -8, orbitEnd: 8 },
    extra = {}
  ) => ({
    id, duration, bg, mood, sfx, camera, titleCard, caption, actors, overlayProps, ...extra
  });

  const guide = (kfs, opts = {}) => ({
    id: opts.id || 'guide',
    role: 'stickman',
    outfit: 'guide',
    color: opts.color || '#b91c1c',
    scale: 1.0,
    ...opts,
    keyframes: kfs
  });

  const andean = (id, kfs, color = '#0f766e', opts = {}) => ({
    id, role: 'stickman', outfit: 'andean', color, scale: 1.0, ...opts, keyframes: kfs
  });

  const priest = (kfs, opts = {}) => ({
    id: opts.id || 'aramu',
    role: 'stickman',
    outfit: 'inca_priest',
    color: '#991b1b',
    scale: 1.06,
    ...opts,
    keyframes: kfs
  });

  const conquistador = (id, kfs, opts = {}) => ({
    id, role: 'stickman', outfit: 'conquistador', color: '#94a3b8', scale: 1.02, ...opts, keyframes: kfs
  });

  const archaeologist = (id, kfs, color = '#d97706', opts = {}) => ({
    id, role: 'stickman', outfit: 'archaeologist', color, scale: 1.0, ...opts, keyframes: kfs
  });

  const scientist = (id, kfs, opts = {}) => ({
    id, role: 'stickman', outfit: 'forensic', color: '#f1f5f9', scale: 1.0, ...opts, keyframes: kfs
  });

  const detective = (kfs, opts = {}) => ({
    id: 'narrator',
    role: 'stickman',
    outfit: 'detective',
    hat: 'fedora',
    color: '#334155',
    scale: 1.04,
    ...opts,
    keyframes: kfs
  });

  const shadow = (kfs) => ({
    id: 'shadow', role: 'shadow', scale: 1.06, keyframes: kfs
  });

  window.StickmanStudio = window.StickmanStudio || {};
  window.StickmanStudio.EPISODES = window.StickmanStudio.EPISODES || [];
  window.StickmanStudio.EPISODES.push({
    id: 'hayu-marca-peru',
    title: 'EP 01 Perú: La Puerta de Hayu Marca — El Portal de Puno (5-6 min)',
    formats: {
      full: {
        label: 'YouTube Largo (16:9 · Full HD 1080p)',
        width: 1920,
        height: 1080,
        fps: 60,
        social: {
          youtube: {
            title: 'La Puerta de Hayu Marca en Puno: El Portal Tallado en Roca Sólida del Perú',
            description: 'A casi cuatro mil metros de altura en Puno, Perú, frente al Lago Titicaca, existe una monumental puerta de siete metros tallada directamente en roca sólida que no conduce a ninguna cámara.\n\nEn este expediente investigamos la historia completa: el extraño descubrimiento del guía José Luis Delgado Mamani en 1996, la leyenda ancestral del sacerdote Aramu Muru y el Disco Solar de Oro en 1533, las anomalías electromagnéticas reportadas por exploradores y lo que realmente explica la geología moderna.\n\n¿Arquitectura ceremonial inconclusa, fallas piezoeléctricas bajo el Altiplano o algo que aún no comprendemos? Déjanos tu opinión en los comentarios y dime qué otro misterio del Perú quieres que investiguemos.\n\n#misteriosdelperu #hayumarca #puno #lagotiticaca #casossinresolver #documental'
          },
          facebook: {
            title: 'El portal tallado en roca sólida de Puno: ¿qué oculta la Puerta de Hayu Marca?',
            description: 'A 4,000 metros en los Andes peruanos hay una puerta gigante que da directo contra la montaña... pero testigos hablan de vibraciones extrañas, luces en el Lago Titicaca y la fuga de un sacerdote inca en 1533. Mira el documental completo en vertical y cuéntanos qué teoría te convence más. #misteriosdelperu #hayumarca #puno #lagotiticaca'
          },
          tiktok: {
            description: 'La Puerta de Hayu Marca en Puno, Perú 😱🇵🇪 Siete metros tallados en piedra sólida que no llevan a ningún lado... o eso creían #misteriosdelperu #hayumarca #puno #peru #lagotiticaca #documental #fyp'
          }
        },
        scenes: [
          /* h01 – HOOK: Night energy surging inside the 7-meter solid stone doorway */
          mk('h01', 9.2, 'hayuMarcaNight', 'shock', 'sting', 'PUNO, PERÚ // 4,000 METROS',
            'En lo alto del Altiplano peruano existe una puerta gigante de siete metros tallada en roca sólida que no lleva a ninguna habitación.',
            [
              guide([
                { t: 0, x: 0.28, y: 0.74, pose: 'walk', walkSpeed: 1.1, facing: 1, expr: 'shocked', prop: 'flashlight' },
                { t: 0.55, x: 0.36, y: 0.74, pose: 'point_up', facing: 1, expr: 'shocked', prop: 'flashlight' },
                { t: 1, x: 0.36, y: 0.74, pose: 'gasp', facing: 1, expr: 'shocked', prop: 'flashlight' }
              ])
            ],
            [{ type: 'peruMap', x: 0.80, y: 0.28, label: 'HAYU MARCA · PUNO' }],
            { zoomStart: 1.04, zoomEnd: 1.20, orbitStart: -16, orbitEnd: 12, heightStart: 1.95, heightEnd: 2.35, shake: 0.9 },
            { portalPower: 0.45, portalPowerEnd: 0.85 }),

          /* h02 – HOOK: Blue fire & people vanishing */
          mk('h02', 9.0, 'hayuMarcaNight', 'eerie', 'heartbeat', 'LA PUERTA DE LOS DIOSES',
            'Sin embargo, los pobladores aseguran desde hace siglos que de noche brota un fuego azul del muro y que quienes la cruzan desaparecen sin rastro.',
            [
              andean('a1', [
                { t: 0, x: 0.25, y: 0.74, pose: 'scared', facing: 1, expr: 'shocked', prop: 'none' },
                { t: 1, x: 0.28, y: 0.74, pose: 'gasp', facing: 1, expr: 'shocked', prop: 'none' }
              ], '#0f766e'),
              shadow([
                { t: 0, x: 0.52, y: 0.74, pose: 'shadow_lurk', facing: 1, expr: 'empty_eyes', prop: 'none' },
                { t: 0.55, x: 0.50, y: 0.74, pose: 'vanish', facing: 1, expr: 'empty_eyes', prop: 'none' },
                { t: 1, x: 0.50, y: 0.74, pose: 'vanish', facing: 1, expr: 'empty_eyes', prop: 'none', alpha: 0 }
              ])
            ],
            [],
            { zoomStart: 1.10, zoomEnd: 1.24, orbitStart: 12, orbitEnd: -10, heightStart: 2.1, heightEnd: 1.9, shake: 1.1 },
            { portalPower: 0.95, portalPowerEnd: 0.25 }),

          /* h03 – HOOK: Detective presenter in Altiplano setting */
          mk('h03', 9.0, 'spotlight', 'mysterious', 'pulse', 'EXPEDIENTE PERÚ',
            '¿Qué es realmente la Puerta de Hayu Marca en Puno y qué ocurrió allí hace casi cinco siglos? Este es el expediente completo.',
            [
              detective([
                { t: 0, x: 0.34, y: 0.74, pose: 'walk', walkSpeed: 1.0, facing: 1, expr: 'curious', prop: 'flashlight', speaking: true },
                { t: 0.5, x: 0.44, y: 0.74, pose: 'talk', facing: 1, expr: 'mysterious', prop: 'none', speaking: true },
                { t: 1, x: 0.46, y: 0.74, pose: 'point', facing: 1, expr: 'mysterious', prop: 'none', speaking: true }
              ])
            ],
            [{ type: 'rockScan', x: 0.74, y: 0.30, label: 'ARQUITECTURA IMPOSIBLE' }],
            { zoomStart: 1.0, zoomEnd: 1.10, orbitStart: -6, orbitEnd: 8 }),

          /* h04 – Discovery 1996 intro */
          mk('h04', 9.2, 'hayuMarcaDay', 'mysterious', null, 'JULI, PUNO // 1996',
            'La historia moderna comienza en el año mil novecientos noventa y seis, cerca de la localidad puneña de Juli y las orillas del Lago Titicaca.',
            [
              guide([
                { t: 0, x: 0.22, y: 0.74, pose: 'walk', walkSpeed: 1.15, facing: 1, expr: 'curious', prop: 'compass' },
                { t: 1, x: 0.52, y: 0.74, pose: 'inspect', facing: 1, expr: 'curious', prop: 'compass' }
              ]),
              andean('loc1', [
                { t: 0, x: 0.72, y: 0.74, pose: 'point', facing: -1, expr: 'neutral', prop: 'none', speaking: true },
                { t: 1, x: 0.72, y: 0.74, pose: 'idle', facing: -1, expr: 'curious', prop: 'none' }
              ], '#7c2d12')
            ],
            [{ type: 'peruMap', x: 0.22, y: 0.28, label: 'JULI · LAGO TITICACA' }],
            { zoomStart: 0.96, zoomEnd: 1.08, orbitStart: -12, orbitEnd: 6, heightStart: 2.3, heightEnd: 2.0 },
            { portalPower: 0 }),

          /* h05 – José Luis Delgado Mamani recurring dream */
          mk('h05', 9.2, 'darkRoom', 'eerie', 'pulse', 'UN SUEÑO REPETIDO',
            'Un guía de montaña llamado José Luis Delgado Mamani confesó que llevaba años soñando con un camino andino cubierto de neblina y un portal rosado.',
            [
              guide([
                { t: 0, x: 0.42, y: 0.74, pose: 'gasp', facing: 1, expr: 'mysterious', prop: 'none' },
                { t: 0.6, x: 0.46, y: 0.74, pose: 'scared', facing: -1, expr: 'shocked', prop: 'none' },
                { t: 1, x: 0.46, y: 0.74, pose: 'talk', facing: 1, expr: 'curious', prop: 'none', speaking: true }
              ]),
              shadow([
                { t: 0, x: 0.68, y: 0.74, pose: 'shadow_lurk', facing: -1, expr: 'empty_eyes', prop: 'none' },
                { t: 1, x: 0.64, y: 0.74, pose: 'shadow_lurk', facing: -1, expr: 'empty_eyes', prop: 'none' }
              ])
            ],
            [{ type: 'splitPortal', x: 0.72, y: 0.30, label: 'VISIÓN ONÍRICA' }],
            { zoomStart: 1.0, zoomEnd: 1.14, orbitStart: -8, orbitEnd: 10 }),

          /* h06 – Trekking through Bosque de Piedras */
          mk('h06', 9.0, 'andeanTrail', 'tense', null, 'EL BOSQUE DE PIEDRAS',
            'Al explorar una zona poco transitada entre gigantescas formaciones de piedra rojiza, sintió que sus sueños cobraban vida frente a sus ojos.',
            [
              guide([
                { t: 0, x: 0.18, y: 0.74, pose: 'climb', walkSpeed: 1.1, facing: 1, expr: 'curious', prop: 'camera' },
                { t: 0.65, x: 0.48, y: 0.74, pose: 'walk', walkSpeed: 1.0, facing: 1, expr: 'suspicious', prop: 'camera' },
                { t: 1, x: 0.60, y: 0.74, pose: 'point', facing: 1, expr: 'shocked', prop: 'camera' }
              ])
            ],
            [{ type: 'clock', x: 0.82, y: 0.26, label: '4,000 METROS' }],
            { zoomStart: 1.0, zoomEnd: 1.14, orbitStart: -14, orbitEnd: 8 }),

          /* h07 – Stunned in front of sunset cliff */
          mk('h07', 9.2, 'hayuMarcaSunset', 'shock', 'sting', 'EL HALLAZGO EN LA ROCA',
            'Tras apartar la paja brava y el musgo, quedó paralizado: allí estaba exactamente la misma puerta tallada en la montaña con la que había soñado.',
            [
              guide([
                { t: 0, x: 0.28, y: 0.74, pose: 'walk', walkSpeed: 1.0, facing: 1, expr: 'curious', prop: 'camera' },
                { t: 0.5, x: 0.38, y: 0.74, pose: 'gasp', facing: 1, expr: 'shocked', prop: 'none' },
                { t: 1, x: 0.38, y: 0.74, pose: 'kneel', facing: 1, expr: 'shocked', prop: 'camera' }
              ])
            ],
            [{ type: 'rockScan', x: 0.78, y: 0.26, label: 'MURO DE 7 × 7 METROS' }],
            { zoomStart: 0.92, zoomEnd: 1.16, orbitStart: -18, orbitEnd: 12, heightStart: 1.75, heightEnd: 2.35 },
            { portalPower: 0 }),

          /* h08 – Dimensions & circular depression */
          mk('h08', 9.2, 'hayuMarcaDay', 'mysterious', null, 'EL ENIGMA DEL NICHO',
            'Un gran marco cuadrado de siete metros alberga en su base un nicho pequeño de apenas dos metros de alto... y un extraño agujero redondo en el centro.',
            [
              archaeologist('arch1', [
                { t: 0, x: 0.34, y: 0.74, pose: 'inspect', facing: 1, expr: 'suspicious', prop: 'clipboard' },
                { t: 1, x: 0.44, y: 0.74, pose: 'point', facing: 1, expr: 'curious', prop: 'clipboard' }
              ]),
              guide([
                { t: 0, x: 0.64, y: 0.74, pose: 'talk', facing: -1, expr: 'curious', prop: 'none', speaking: true },
                { t: 1, x: 0.62, y: 0.74, pose: 'point', facing: -1, expr: 'suspicious', prop: 'none' }
              ])
            ],
            [{ type: 'solarDiskZoom', x: 0.20, y: 0.28, label: 'RANURA CIRCULAR' }],
            { zoomStart: 1.05, zoomEnd: 1.18, orbitStart: 10, orbitEnd: -10 },
            { portalPower: 0 }),

          /* h09 – Flashback 1533 Coricancha */
          mk('h09', 9.2, 'incaTemple', 'tense', 'heartbeat', 'CUSCO // AÑO 1533',
            'Para entender esa ranura circular, las crónicas aymaras y quechuas nos llevan al año mil quinientos treinta y tres, durante la caída del Tahuantinsuyo.',
            [
              priest([
                { t: 0, x: 0.36, y: 0.74, pose: 'idle', facing: 1, expr: 'suspicious', prop: 'solar_disk' },
                { t: 0.55, x: 0.42, y: 0.74, pose: 'talk', facing: 1, expr: 'mysterious', prop: 'solar_disk', speaking: true },
                { t: 1, x: 0.44, y: 0.74, pose: 'gasp', facing: -1, expr: 'shocked', prop: 'solar_disk' }
              ]),
              andean('guard1', [
                { t: 0, x: 0.64, y: 0.74, pose: 'scared', facing: -1, expr: 'shocked', prop: 'torch' },
                { t: 1, x: 0.68, y: 0.74, pose: 'point', facing: -1, expr: 'shocked', prop: 'torch' }
              ], '#7f1d1d')
            ],
            [{ type: 'solarDiskZoom', x: 0.80, y: 0.28, label: 'DISCO DEL CORICANCHA' }],
            { zoomStart: 1.0, zoomEnd: 1.12, orbitStart: -12, orbitEnd: 8 }),

          /* h10 – Conquistadors enter temple */
          mk('h10', 9.0, 'incaTemple', 'shock', 'sting', 'SAQUEO DEL TEMPLO',
            'Mientras los conquistadores españoles avanzaban sobre los templos del Cusco en busca de tesoros, el sacerdote Aramu Muru tomó la reliquia más sagrada.',
            [
              conquistador('conq1', [
                { t: 0, x: 0.14, y: 0.74, pose: 'run', walkSpeed: 1.3, facing: 1, expr: 'suspicious', prop: 'torch' },
                { t: 1, x: 0.44, y: 0.74, pose: 'hold_torch', facing: 1, expr: 'suspicious', prop: 'torch' }
              ]),
              conquistador('conq2', [
                { t: 0, x: 0.04, y: 0.74, pose: 'run', walkSpeed: 1.25, facing: 1, expr: 'suspicious', prop: 'knife' },
                { t: 1, x: 0.28, y: 0.74, pose: 'point', facing: 1, expr: 'suspicious', prop: 'knife' }
              ]),
              priest([
                { t: 0, x: 0.62, y: 0.74, pose: 'gasp', facing: -1, expr: 'shocked', prop: 'solar_disk' },
                { t: 1, x: 0.84, y: 0.74, pose: 'run', walkSpeed: 1.4, facing: 1, expr: 'shocked', prop: 'solar_disk' }
              ])
            ],
            [],
            { zoomStart: 1.02, zoomEnd: 1.16, orbitStart: 14, orbitEnd: -12, shake: 0.8 }),

          /* h11 – The Golden Solar Disk of Lemuria/Incas */
          mk('h11', 9.0, 'spotlight', 'mysterious', null, 'LA LLAVE DE LOS SIETE RAYOS',
            'Se trataba del mítico Disco Solar de Oro, un medallón forjado por culturas anteriores a los incas que supuestamente ocultaba una frecuencia vibratoria.',
            [
              priest([
                { t: 0, x: 0.46, y: 0.74, pose: 'insert_disk', facing: 1, expr: 'mysterious', prop: 'solar_disk' },
                { t: 1, x: 0.46, y: 0.74, pose: 'idle', facing: 1, expr: 'mysterious', prop: 'solar_disk' }
              ])
            ],
            [{ type: 'solarDiskZoom', x: 0.76, y: 0.30, label: 'LLAVE DE ORO SAGRADA' }],
            { zoomStart: 1.06, zoomEnd: 1.22, orbitStart: -15, orbitEnd: 15 }),

          /* h12 – Escape across the freezing Andes toward Titicaca */
          mk('h12', 9.2, 'andeanTrail', 'tense', 'heartbeat', 'HUIDA HACIA EL TITICACA',
            'Cargando el disco dorado bajo su manto, el sacerdote cruzó cientos de kilómetros por quebradas heladas perseguido hasta las alturas de Puno.',
            [
              priest([
                { t: 0, x: 0.28, y: 0.74, pose: 'run', walkSpeed: 1.45, facing: 1, expr: 'shocked', prop: 'solar_disk' },
                { t: 1, x: 0.76, y: 0.74, pose: 'climb', walkSpeed: 1.35, facing: 1, expr: 'suspicious', prop: 'solar_disk' }
              ]),
              conquistador('conq1', [
                { t: 0, x: 0.04, y: 0.74, pose: 'run', walkSpeed: 1.3, facing: 1, expr: 'suspicious', prop: 'torch' },
                { t: 1, x: 0.40, y: 0.74, pose: 'run', walkSpeed: 1.3, facing: 1, expr: 'suspicious', prop: 'torch' }
              ])
            ],
            [{ type: 'peruMap', x: 0.20, y: 0.28, label: 'RUTA CUSCO → PUNO' }],
            { zoomStart: 1.0, zoomEnd: 1.15, orbitStart: -10, orbitEnd: 10, shake: 0.7 }),

          /* h13 – Arriving at Hayu Marca by night before guardians */
          mk('h13', 9.0, 'hayuMarcaNight', 'eerie', null, 'EL VALLE DE LOS ESPÍRITUS',
            'Al llegar de noche al valle de Hayu Marca, donde aguardaban otros guardianes andinos con antorchas, el muro de piedra permanecía completamente sellado.',
            [
              priest([
                { t: 0, x: 0.36, y: 0.74, pose: 'walk', walkSpeed: 1.05, facing: 1, expr: 'mysterious', prop: 'solar_disk' },
                { t: 1, x: 0.48, y: 0.74, pose: 'idle', facing: 1, expr: 'mysterious', prop: 'solar_disk' }
              ]),
              andean('guardL', [
                { t: 0, x: 0.22, y: 0.74, pose: 'hold_torch', facing: 1, expr: 'curious', prop: 'torch' },
                { t: 1, x: 0.22, y: 0.74, pose: 'hold_torch', facing: 1, expr: 'curious', prop: 'torch' }
              ], '#b91c1c'),
              andean('guardR', [
                { t: 0, x: 0.76, y: 0.74, pose: 'hold_torch', facing: -1, expr: 'curious', prop: 'torch' },
                { t: 1, x: 0.76, y: 0.74, pose: 'hold_torch', facing: -1, expr: 'curious', prop: 'torch' }
              ], '#0f766e')
            ],
            [],
            { zoomStart: 0.95, zoomEnd: 1.10, orbitStart: -14, orbitEnd: 14 },
            { portalPower: 0.08 }),

          /* h14 – Placing the disk into the rock slot */
          mk('h14', 9.2, 'hayuMarcaNight', 'tense', 'pulse', 'EL RITUAL EN LA ROCA',
            'Según el relato tradicional, Aramu Muru pronunció un cántico grave y encajó el Disco Solar exactamente en la hendidura circular del portal.',
            [
              priest([
                { t: 0, x: 0.46, y: 0.74, pose: 'walk', facing: 1, expr: 'mysterious', prop: 'solar_disk' },
                { t: 0.4, x: 0.50, y: 0.74, pose: 'insert_disk', facing: 1, expr: 'shocked', prop: 'solar_disk' },
                { t: 1, x: 0.50, y: 0.74, pose: 'insert_disk', facing: 1, expr: 'mysterious', prop: 'solar_disk' }
              ])
            ],
            [{ type: 'seismicWave', x: 0.80, y: 0.26, label: 'RESONANCIA ARMÓNICA' }],
            { zoomStart: 1.05, zoomEnd: 1.25, orbitStart: -12, orbitEnd: 12, heightStart: 1.8, heightEnd: 2.2, shake: 0.8 },
            { portalPower: 0.15, portalPowerEnd: 0.75 }),

          /* h15 – The blinding blue portal opens! */
          mk('h15', 9.2, 'hayuMarcaNight', 'shock', 'sting', 'LA APERTURA DEL PORTAL',
            'En ese instante, la montaña comenzó a vibrar como un tambor y una columna de luz azul celeste se encendió en medio de la roca sólida.',
            [
              priest([
                { t: 0, x: 0.50, y: 0.74, pose: 'insert_disk', facing: 1, expr: 'shocked', prop: 'none' },
                { t: 1, x: 0.50, y: 0.74, pose: 'point_up', facing: 1, expr: 'shocked', prop: 'none' }
              ]),
              andean('witness1', [
                { t: 0, x: 0.22, y: 0.74, pose: 'gasp', facing: 1, expr: 'shocked', prop: 'torch' },
                { t: 1, x: 0.18, y: 0.74, pose: 'cover_ears', facing: 1, expr: 'shocked', prop: 'none' }
              ], '#0f766e'),
              andean('witness2', [
                { t: 0, x: 0.78, y: 0.74, pose: 'scared', facing: -1, expr: 'shocked', prop: 'torch' },
                { t: 1, x: 0.82, y: 0.74, pose: 'kneel', facing: -1, expr: 'shocked', prop: 'none' }
              ], '#b45309')
            ],
            [],
            { zoomStart: 1.08, zoomEnd: 1.26, orbitStart: 16, orbitEnd: -16, shake: 1.8 },
            { portalPower: 0.75, portalPowerEnd: 1.0 }),

          /* h16 – Priest steps inside & disappears */
          mk('h16', 9.0, 'hayuMarcaNight', 'eerie', 'heartbeat', 'DESAPARICIÓN EN LA LUZ',
            'El sacerdote entregó las últimas instrucciones a los ancianos, dio dos pasos hacia el resplandor interior y desapareció delante de todos para siempre.',
            [
              priest([
                { t: 0, x: 0.50, y: 0.74, pose: 'walk', facing: 1, expr: 'mysterious', prop: 'none' },
                { t: 0.5, x: 0.50, y: 0.74, pose: 'vanish', facing: 1, expr: 'mysterious', prop: 'none' },
                { t: 1, x: 0.50, y: 0.74, pose: 'vanish', facing: 1, expr: 'empty_eyes', prop: 'none', alpha: 0 }
              ]),
              andean('witness1', [
                { t: 0, x: 0.24, y: 0.74, pose: 'gasp', facing: 1, expr: 'shocked', prop: 'torch' },
                { t: 1, x: 0.26, y: 0.74, pose: 'scared', facing: 1, expr: 'shocked', prop: 'torch' }
              ], '#0f766e')
            ],
            [{ type: 'question', x: 0.80, y: 0.26, label: '¿A DÓNDE FUE?' }],
            { zoomStart: 1.16, zoomEnd: 1.02, orbitStart: -10, orbitEnd: 14 },
            { portalPower: 1.0, portalPowerEnd: 0.15 }),

          /* h17 – Conquistadors arrive at blank silent wall */
          mk('h17', 9.0, 'hayuMarcaNight', 'tense', null, 'SOLO PIEDRA SELLADA',
            'Cuando las patrullas españolas alcanzaron el barranco minutos después, solo encontraron un muro inmóvil de arenisca roja y ningún rastro de oro.',
            [
              conquistador('conq1', [
                { t: 0, x: 0.22, y: 0.74, pose: 'run', walkSpeed: 1.2, facing: 1, expr: 'suspicious', prop: 'torch' },
                { t: 0.5, x: 0.44, y: 0.74, pose: 'confused', facing: 1, expr: 'shocked', prop: 'torch' },
                { t: 1, x: 0.46, y: 0.74, pose: 'inspect', facing: 1, expr: 'suspicious', prop: 'torch' }
              ]),
              conquistador('conq2', [
                { t: 0, x: 0.68, y: 0.74, pose: 'hold_torch', facing: -1, expr: 'confused', prop: 'torch' },
                { t: 1, x: 0.62, y: 0.74, pose: 'confused', facing: -1, expr: 'shocked', prop: 'torch' }
              ])
            ],
            [],
            { zoomStart: 1.0, zoomEnd: 1.12, orbitStart: 12, orbitEnd: -10 },
            { portalPower: 0 }),

          /* h18 – Modern researchers arrive */
          mk('h18', 9.2, 'expeditionCamp', 'mysterious', null, 'EXPEDICIONES MODERNAS',
            'Pero esto dejó de ser solo una leyenda antigua cuando investigadores, geólogos y viajeros modernos llevaron instrumentos al monumento.',
            [
              archaeologist('arch1', [
                { t: 0, x: 0.22, y: 0.74, pose: 'walk', walkSpeed: 1.0, facing: 1, expr: 'curious', prop: 'scanner' },
                { t: 1, x: 0.46, y: 0.74, pose: 'inspect', facing: 1, expr: 'curious', prop: 'scanner' }
              ]),
              scientist('sci1', [
                { t: 0, x: 0.74, y: 0.74, pose: 'talk', facing: -1, expr: 'suspicious', prop: 'clipboard', speaking: true },
                { t: 1, x: 0.66, y: 0.74, pose: 'inspect', facing: -1, expr: 'curious', prop: 'clipboard' }
              ])
            ],
            [{ type: 'rockScan', x: 0.22, y: 0.26, label: 'ESCANEO LÁSER 3D' }],
            { zoomStart: 1.0, zoomEnd: 1.12, orbitStart: -12, orbitEnd: 8 }),

          /* h19 – Precision carving anomaly */
          mk('h19', 9.2, 'hayuMarcaDay', 'mysterious', null, 'CORTES MILIMÉTRICOS',
            'El primer enigma físico está en el tallado: el marco interior tiene esquinas rectas tan limpias que desconciertan al compararse con la piedra sin pulir alrededor.',
            [
              archaeologist('arch1', [
                { t: 0, x: 0.36, y: 0.74, pose: 'inspect', facing: 1, expr: 'curious', prop: 'scanner' },
                { t: 1, x: 0.44, y: 0.74, pose: 'point', facing: 1, expr: 'shocked', prop: 'scanner' }
              ]),
              scientist('sci1', [
                { t: 0, x: 0.64, y: 0.74, pose: 'kneel', facing: -1, expr: 'suspicious', prop: 'camera' },
                { t: 1, x: 0.60, y: 0.74, pose: 'inspect', facing: -1, expr: 'curious', prop: 'camera' }
              ])
            ],
            [{ type: 'rockScan', x: 0.80, y: 0.28, label: 'PRECISIÓN DEL TALLADO' }],
            { zoomStart: 1.08, zoomEnd: 1.24, orbitStart: -10, orbitEnd: 14 },
            { portalPower: 0 }),

          /* h20 – Magnetic compasses spinning wildly */
          mk('h20', 9.0, 'hayuMarcaSunset', 'tense', 'pulse', 'ANOMALÍA MAGNÉTICA',
            'Varios excursionistas grabaron cómo la aguja de sus brújulas comienza a girar sin dirección fija apenas ingresan dentro del nicho central.',
            [
              archaeologist('exp1', [
                { t: 0, x: 0.42, y: 0.74, pose: 'inspect', facing: 1, expr: 'curious', prop: 'compass' },
                { t: 0.5, x: 0.48, y: 0.74, pose: 'gasp', facing: 1, expr: 'shocked', prop: 'compass' },
                { t: 1, x: 0.48, y: 0.74, pose: 'confused', facing: -1, expr: 'shocked', prop: 'compass' }
              ])
            ],
            [{ type: 'compass', x: 0.78, y: 0.28, label: 'CAMPO ALTERADO' }],
            { zoomStart: 1.04, zoomEnd: 1.18, orbitStart: 12, orbitEnd: -12 },
            { portalPower: 0.12 }),

          /* h21 – Rhythmic sound & vibration inside chest */
          mk('h21', 9.2, 'hayuMarcaNight', 'eerie', 'heartbeat', 'EL ZUMBIDO SUBTERRÁNEO',
            'Quienes apoyan la frente en el nicho de piedra coinciden en un detalle inquietante: perciben un zumbido rítmico que parece salir del corazón de la montaña.',
            [
              guide([
                { t: 0, x: 0.48, y: 0.74, pose: 'inspect', facing: 1, expr: 'curious', prop: 'none' },
                { t: 0.55, x: 0.48, y: 0.74, pose: 'cover_ears', facing: 1, expr: 'shocked', prop: 'none' },
                { t: 1, x: 0.48, y: 0.74, pose: 'scared', facing: -1, expr: 'shocked', prop: 'none' }
              ])
            ],
            [{ type: 'seismicWave', x: 0.24, y: 0.28, label: 'FRECUENCIA BAJA · PUNO' }],
            { zoomStart: 1.12, zoomEnd: 1.28, orbitStart: -8, orbitEnd: 8, shake: 1.2 },
            { portalPower: 0.25 }),

          /* h22 – Blue lights rising from Lake Titicaca */
          mk('h22', 9.2, 'titicacaLake', 'shock', 'sting', 'LUCES EN EL LAGO TITICACA',
            'A pocos kilómetros de allí, pescadores del Lago Titicaca afirman haber visto esferas luminosas azules emerger del agua y volar directo hacia Hayu Marca.',
            [
              andean('fish1', [
                { t: 0, x: 0.34, y: 0.74, pose: 'point_up', facing: 1, expr: 'shocked', prop: 'none' },
                { t: 1, x: 0.38, y: 0.74, pose: 'gasp', facing: 1, expr: 'shocked', prop: 'none' }
              ], '#b91c1c'),
              andean('fish2', [
                { t: 0, x: 0.62, y: 0.74, pose: 'scared', facing: -1, expr: 'shocked', prop: 'none' },
                { t: 1, x: 0.66, y: 0.74, pose: 'point_up', facing: -1, expr: 'shocked', prop: 'none' }
              ], '#0f766e')
            ],
            [{ type: 'orbs', x: 0.78, y: 0.24 }],
            { zoomStart: 0.96, zoomEnd: 1.12, orbitStart: -15, orbitEnd: 15 },
            { subBg: 'lights' }),

          /* h23 – Nocturnal shadows at camp */
          mk('h23', 9.0, 'expeditionCamp', 'shock', 'heartbeat', 'AVISTAMIENTOS NOCTURNOS',
            'Campistas que pasaron la noche frente al monumento aseguran haber escuchado pasos entre las rocas y visto siluetas cruzar la piedra sin linternas.',
            [
              archaeologist('camp1', [
                { t: 0, x: 0.34, y: 0.74, pose: 'scared', facing: 1, expr: 'shocked', prop: 'flashlight' },
                { t: 1, x: 0.30, y: 0.74, pose: 'point', facing: 1, expr: 'shocked', prop: 'flashlight' }
              ]),
              shadow([
                { t: 0, x: 0.76, y: 0.74, pose: 'shadow_lurk', facing: -1, expr: 'empty_eyes', prop: 'none' },
                { t: 0.6, x: 0.62, y: 0.74, pose: 'shadow_lurk', facing: -1, expr: 'empty_eyes', prop: 'none' },
                { t: 1, x: 0.56, y: 0.74, pose: 'vanish', facing: -1, expr: 'empty_eyes', prop: 'none' }
              ])
            ],
            [],
            { zoomStart: 1.0, zoomEnd: 1.16, orbitStart: 10, orbitEnd: -12, shake: 0.8 }),

          /* h24 – Acoustic resonance tunnel illusion */
          mk('h24', 9.0, 'hayuMarcaNight', 'eerie', null, 'EFECTO ACÚSTICO',
            'Incluso los más escépticos admiten que al hablar frente al muro cóncavo la voz rebota con una reverberación profunda que desconcierta al oído humano.',
            [
              scientist('sci1', [
                { t: 0, x: 0.38, y: 0.74, pose: 'talk', facing: 1, expr: 'curious', prop: 'scanner', speaking: true },
                { t: 1, x: 0.44, y: 0.74, pose: 'inspect', facing: 1, expr: 'suspicious', prop: 'scanner' }
              ])
            ],
            [{ type: 'seismicWave', x: 0.78, y: 0.28, label: 'ECO EN EL ALTIPLANO' }],
            { zoomStart: 1.0, zoomEnd: 1.14, orbitStart: -12, orbitEnd: 10 },
            { portalPower: 0.1 }),

          /* h25 – Chullpas & Titicaca energy corridor */
          mk('h25', 9.0, 'titicacaLake', 'mysterious', null, 'EL CORREDOR SAGRADO',
            'Lo más curioso al trazar un mapa de la región es que Hayu Marca está alineado con las chullpas de Sillustani, la Isla del Sol y los centros ceremoniales del Titicaca.',
            [
              archaeologist('arch1', [
                { t: 0, x: 0.36, y: 0.74, pose: 'talk', facing: 1, expr: 'curious', prop: 'clipboard', speaking: true },
                { t: 1, x: 0.46, y: 0.74, pose: 'point', facing: 1, expr: 'mysterious', prop: 'clipboard' }
              ])
            ],
            [{ type: 'peruMap', x: 0.78, y: 0.28, label: 'ALINEACIÓN DEL TITICACA' }],
            { zoomStart: 0.98, zoomEnd: 1.10, orbitStart: -14, orbitEnd: 10 }),

          /* h26 – Question time: Science investigates */
          mk('h26', 9.0, 'labRoom', 'tense', 'pulse', '¿QUÉ DICE LA CIENCIA?',
            'Pero dejemos el mito a un lado por un momento: ¿qué explicación científica y arqueológica real tiene este gigante de piedra?',
            [
              scientist('sci1', [
                { t: 0, x: 0.36, y: 0.74, pose: 'talk', facing: 1, expr: 'curious', prop: 'clipboard', speaking: true },
                { t: 1, x: 0.40, y: 0.74, pose: 'point', facing: 1, expr: 'suspicious', prop: 'clipboard' }
              ]),
              detective([
                { t: 0, x: 0.66, y: 0.74, pose: 'idle', facing: -1, expr: 'curious', prop: 'none' },
                { t: 1, x: 0.62, y: 0.74, pose: 'talk', facing: -1, expr: 'mysterious', prop: 'none', speaking: true }
              ])
            ],
            [{ type: 'question', x: 0.20, y: 0.26, label: 'CIENCIA VS. MITO' }],
            { zoomStart: 1.0, zoomEnd: 1.10, orbitStart: -10, orbitEnd: 10 }),

          /* h27 – Hypothesis 1: Unfinished Pre-Inca ceremonial project */
          mk('h27', 9.2, 'hayuMarcaDay', 'mysterious', null, 'TEORÍA 1 // OBRA PREINCA',
            'La primera hipótesis señala que fue una fachada ceremonial iniciada por la cultura Tiwanaku o los lupacas antes de los incas, que quedó inconclusa.',
            [
              archaeologist('arch1', [
                { t: 0, x: 0.34, y: 0.74, pose: 'talk', facing: 1, expr: 'curious', prop: 'clipboard', speaking: true },
                { t: 1, x: 0.38, y: 0.74, pose: 'point_up', facing: 1, expr: 'curious', prop: 'clipboard' }
              ]),
              scientist('sci1', [
                { t: 0, x: 0.68, y: 0.74, pose: 'inspect', facing: -1, expr: 'neutral', prop: 'camera' },
                { t: 1, x: 0.64, y: 0.74, pose: 'talk', facing: -1, expr: 'curious', prop: 'camera', speaking: true }
              ])
            ],
            [{ type: 'folder', x: 0.20, y: 0.26, label: 'CULTURA TIWANAKU' }],
            { zoomStart: 1.0, zoomEnd: 1.12, orbitStart: -14, orbitEnd: 8 },
            { portalPower: 0 }),

          /* h28 – Astronomical solar equinox alignment */
          mk('h28', 9.2, 'hayuMarcaSunset', 'mysterious', null, 'ALINEACIÓN SOLAR',
            'Según mediciones astronómicas locales, durante los equinoccios el sol naciente ilumina directamente el eje del nicho para ceremonias de solsticio andino.',
            [
              priest([
                { t: 0, x: 0.42, y: 0.74, pose: 'point_up', facing: 1, expr: 'mysterious', prop: 'none' },
                { t: 1, x: 0.48, y: 0.74, pose: 'wave', facing: 1, expr: 'mysterious', prop: 'none' }
              ]),
              andean('anc1', [
                { t: 0, x: 0.68, y: 0.74, pose: 'kneel', facing: -1, expr: 'curious', prop: 'none' },
                { t: 1, x: 0.68, y: 0.74, pose: 'kneel', facing: -1, expr: 'curious', prop: 'none' }
              ], '#d97706')
            ],
            [{ type: 'solarDiskZoom', x: 0.78, y: 0.28, label: 'CULTO AL INTI' }],
            { zoomStart: 0.94, zoomEnd: 1.12, orbitStart: 12, orbitEnd: -12 },
            { portalPower: 0.1 }),

          /* h29 – Quartz piezoelectricity & tectonic lights! */
          mk('h29', 9.4, 'labRoom', 'tense', 'pulse', 'TEORÍA 2 // PIEZOELECTRICIDAD',
            'La segunda teoría es fascinante: la cordillera de Puno contiene vetas de cuarzo y minerales conductores sometidos a enorme presión tectónica subterránea.',
            [
              scientist('sci1', [
                { t: 0, x: 0.48, y: 0.74, pose: 'talk', facing: 1, expr: 'curious', prop: 'scanner', speaking: true },
                { t: 1, x: 0.48, y: 0.74, pose: 'point', facing: 1, expr: 'suspicious', prop: 'scanner' }
              ])
            ],
            [
              { type: 'seismicWave', x: 0.22, y: 0.28, label: 'DESCARGA DE CUARZO' },
              { type: 'rockScan', x: 0.78, y: 0.28, label: 'FALLA TECTÓNICA' }
            ],
            { zoomStart: 1.0, zoomEnd: 1.16, orbitStart: -12, orbitEnd: 12 }),

          /* h30 – Piezoelectric earthlights / electromagnetic distortion explained */
          mk('h30', 9.2, 'hayuMarcaNight', 'eerie', 'sting', 'PLASMA EN LAS MONTAÑAS',
            'Esa fricción geológica puede liberar cargas electromagnéticas capaces de volver locas las brújulas y generar esferas luminosas azuladas sobre el Titicaca.',
            [
              archaeologist('arch1', [
                { t: 0, x: 0.34, y: 0.74, pose: 'gasp', facing: 1, expr: 'shocked', prop: 'scanner' },
                { t: 1, x: 0.36, y: 0.74, pose: 'point_up', facing: 1, expr: 'shocked', prop: 'scanner' }
              ])
            ],
            [
              { type: 'compass', x: 0.20, y: 0.26, label: 'CARGA ELÉCTRICA' },
              { type: 'orbs', x: 0.78, y: 0.24 }
            ],
            { zoomStart: 1.04, zoomEnd: 1.20, orbitStart: 14, orbitEnd: -10, shake: 0.9 },
            { portalPower: 0.65 }),

          /* h31 – Mystery gap: still doesn't explain the dream & oral history */
          mk('h31', 9.0, 'hayuMarcaSunset', 'mysterious', null, 'EL DETALLE SIN RESPUESTA',
            'Pero la geología no logra responder por qué las tribus aymaras ya llamaban a esa roca abandonada la Puerta de los Dioses mucho antes de que llegaran los turistas.',
            [
              guide([
                { t: 0, x: 0.36, y: 0.74, pose: 'talk', facing: 1, expr: 'mysterious', prop: 'none', speaking: true },
                { t: 1, x: 0.42, y: 0.74, pose: 'idle', facing: 1, expr: 'curious', prop: 'none' }
              ]),
              andean('elder', [
                { t: 0, x: 0.68, y: 0.74, pose: 'talk', facing: -1, expr: 'mysterious', prop: 'none', speaking: true },
                { t: 1, x: 0.66, y: 0.74, pose: 'point', facing: -1, expr: 'mysterious', prop: 'none' }
              ], '#991b1b')
            ],
            [],
            { zoomStart: 1.0, zoomEnd: 1.12, orbitStart: -10, orbitEnd: 10 },
            { portalPower: 0 }),

          /* h32 – Hidden chamber beneath? Ground penetrating radar limit */
          mk('h32', 9.0, 'expeditionCamp', 'tense', 'heartbeat', '¿HAY CÁMARAS OCULTAS?',
            'Las autoridades protegen el área contra excavaciones profundas, por lo que nadie ha perforado detrás de ese muro para comprobar si existe una cámara sellada.',
            [
              archaeologist('arch1', [
                { t: 0, x: 0.36, y: 0.74, pose: 'inspect', facing: 1, expr: 'suspicious', prop: 'scanner' },
                { t: 1, x: 0.44, y: 0.74, pose: 'confused', facing: 1, expr: 'suspicious', prop: 'scanner' }
              ]),
              scientist('sci1', [
                { t: 0, x: 0.66, y: 0.74, pose: 'talk', facing: -1, expr: 'suspicious', prop: 'clipboard', speaking: true },
                { t: 1, x: 0.64, y: 0.74, pose: 'idle', facing: -1, expr: 'suspicious', prop: 'clipboard' }
              ])
            ],
            [{ type: 'folder', x: 0.78, y: 0.26, label: 'EXCAVACIÓN PROHIBIDA' }],
            { zoomStart: 1.02, zoomEnd: 1.14, orbitStart: 10, orbitEnd: -10 }),

          /* h33 – What lies at 4,000 meters in Puno */
          mk('h33', 9.0, 'titicacaLake', 'mysterious', null, 'MISTERIO VIVO DEL PERÚ',
            'Entre la historia oral del Cusco colonial, el silbato del viento andino y las luces sobre el Lago Titicaca, Hayu Marca sigue desafiando a cada viajero.',
            [
              guide([
                { t: 0, x: 0.44, y: 0.74, pose: 'walk', walkSpeed: 0.9, facing: 1, expr: 'curious', prop: 'camera' },
                { t: 1, x: 0.54, y: 0.74, pose: 'point_up', facing: 1, expr: 'mysterious', prop: 'camera' }
              ])
            ],
            [{ type: 'peruMap', x: 0.22, y: 0.28, label: 'PATRIMONIO DE PUNO' }],
            { zoomStart: 0.98, zoomEnd: 1.10, orbitStart: -14, orbitEnd: 12 }),

          /* h34 – Priest silhouette echo */
          mk('h34', 9.0, 'hayuMarcaNight', 'eerie', 'pulse', 'EL ENIGMA CONTINÚA',
            'Tal vez solo sea una cantera sagrada interrumpida por la historia... o la cerradura de piedra de una tradición que aún no sabemos leer.',
            [
              detective([
                { t: 0, x: 0.32, y: 0.74, pose: 'talk', facing: 1, expr: 'mysterious', prop: 'flashlight', speaking: true },
                { t: 1, x: 0.36, y: 0.74, pose: 'point', facing: 1, expr: 'mysterious', prop: 'flashlight', speaking: true }
              ]),
              shadow([
                { t: 0, x: 0.64, y: 0.74, pose: 'shadow_lurk', facing: -1, expr: 'empty_eyes', prop: 'none' },
                { t: 1, x: 0.56, y: 0.74, pose: 'vanish', facing: -1, expr: 'empty_eyes', prop: 'none' }
              ])
            ],
            [{ type: 'question', x: 0.78, y: 0.26, label: '¿PORTAL O TEMPLO?' }],
            { zoomStart: 1.0, zoomEnd: 1.18, orbitStart: -12, orbitEnd: 12 },
            { portalPower: 0.40 }),

          /* h35 – Audience engagement Peru series */
          mk('h35', 8.8, 'hayuMarcaNight', 'tense', null, 'PRÓXIMO CASO EN PERÚ',
            '¿Crees que fue un templo inconcluso, energía sísmica o un verdadero portal? Y qué otro lugar misterioso del Perú deberíamos investigar: Marcahuasi o el Paititi.',
            [
              detective([
                { t: 0, x: 0.44, y: 0.74, pose: 'talk', facing: 1, expr: 'curious', prop: 'none', speaking: true },
                { t: 1, x: 0.48, y: 0.74, pose: 'point', facing: 1, expr: 'mysterious', prop: 'none', speaking: true }
              ])
            ],
            [],
            { zoomStart: 1.04, zoomEnd: 1.18, orbitStart: -14, orbitEnd: 14, heightStart: 1.9, heightEnd: 2.5 },
            { portalPower: 0.75 }),

          /* h36 – Final CTA */
          mk('h36', 8.5, 'spotlight', 'tense', 'sting', 'SUSCRÍBETE',
            'Déjalo abajo en los comentarios y suscríbete ahora para no perderte el próximo expediente secreto del Perú.',
            [
              detective([
                { t: 0, x: 0.30, y: 0.74, pose: 'walk', walkSpeed: 1.1, facing: 1, expr: 'curious', prop: 'flashlight' },
                { t: 0.45, x: 0.44, y: 0.74, pose: 'point', facing: 1, expr: 'mysterious', prop: 'flashlight', speaking: true },
                { t: 1, x: 0.46, y: 0.74, pose: 'wave', facing: 1, expr: 'curious', prop: 'none', speaking: true }
              ])
            ],
            [{ type: 'cta', x: 0.5, y: 0.24, label: 'SUSCRÍBETE AL CANAL' }],
            { zoomStart: 1.0, zoomEnd: 1.10, orbitStart: -10, orbitEnd: 10 })
        ]
      },
      short: {
        label: 'YouTube Short Impacto (9:16 · Full HD 1080×1920)',
        width: 1080,
        height: 1920,
        fps: 60,
        social: {
          youtube: {
            title: 'Esta puerta tallada en roca de Puno no lleva a ningún lado... o eso creían 😱🇵🇪 #hayumarca #peru #shorts',
            description: 'En Puno, Perú, existe un portal gigante de 7 metros tallado directamente en piedra sólida con un agujero redondo para un disco de oro. Mira la investigación completa de 5 minutos en nuestro canal.\n\n#misteriosdelperu #hayumarca #puno #lagotiticaca #casossinresolver #shorts'
          },
          facebook: {
            title: 'La misteriosa Puerta de Hayu Marca en Puno, Perú 😱🇵🇪',
            description: '7 metros tallados en roca sólida a 4,000 metros de altura... y testigos que hablan de luces azules saliendo del Lago Titicaca. ¿Tú qué opinas? Déjalo en los comentarios. #hayumarca #peru #puno #misteriosdelperu #reels'
          },
          tiktok: {
            description: 'La Puerta de los Dioses en Puno, Perú 😱🇵🇪 7 metros tallados en roca sólida que no llevan a ningún lado... 👇 #hayumarca #peru #puno #misteriosdelperu #lagotiticaca #fyp #parati'
          }
        },
        scenes: [
          /* hs1 – EXPLOSIVE 3D OPENING HOOK */
          mk('hs1', 6.8, 'hayuMarcaNight', 'shock', 'sting', 'PUNO, PERÚ · 4,000M',
            'En Puno, Perú, existe una puerta gigante de siete metros tallada en roca sólida que no lleva a ningún lado... o eso creían.',
            [
              guide([
                { t: 0, x: 0.46, y: 0.68, pose: 'gasp', facing: 1, expr: 'shocked', prop: 'flashlight' },
                { t: 0.45, x: 0.48, y: 0.68, pose: 'point_up', facing: 1, expr: 'shocked', prop: 'flashlight' },
                { t: 1, x: 0.50, y: 0.68, pose: 'scared', facing: 1, expr: 'shocked', prop: 'flashlight' }
              ])
            ],
            [{ type: 'peruMap', x: 0.50, y: 0.22, label: 'HAYU MARCA · PUNO' }],
            { zoomStart: 1.06, zoomEnd: 1.24, orbitStart: -16, orbitEnd: 16, heightStart: 1.85, heightEnd: 2.35, shake: 1.5 },
            { portalPower: 0.95, portalPowerEnd: 1.0 }),

          /* hs2 – Aramu Muru escapes & inserts Golden Solar Disk */
          mk('hs2', 7.2, 'hayuMarcaNight', 'eerie', 'heartbeat', 'EL DISCO SOLAR DE 1533',
            'Cuenta la leyenda que en mil quinientos treinta y tres el sacerdote inca Aramu Muru encajó un disco de oro y desapareció dentro de una luz azul.',
            [
              priest([
                { t: 0, x: 0.48, y: 0.68, pose: 'insert_disk', facing: 1, expr: 'mysterious', prop: 'solar_disk' },
                { t: 0.55, x: 0.50, y: 0.68, pose: 'vanish', facing: 1, expr: 'shocked', prop: 'none' },
                { t: 1, x: 0.50, y: 0.68, pose: 'vanish', facing: 1, expr: 'empty_eyes', prop: 'none', alpha: 0 }
              ]),
              andean('witness1', [
                { t: 0, x: 0.26, y: 0.68, pose: 'gasp', facing: 1, expr: 'shocked', prop: 'torch' },
                { t: 1, x: 0.24, y: 0.68, pose: 'scared', facing: 1, expr: 'shocked', prop: 'torch' }
              ], '#0f766e')
            ],
            [{ type: 'solarDiskZoom', x: 0.50, y: 0.23, label: 'LLAVE DE ORO' }],
            { zoomStart: 1.04, zoomEnd: 1.22, orbitStart: 14, orbitEnd: -14, shake: 1.1 },
            { portalPower: 0.35, portalPowerEnd: 1.0 }),

          /* hs3 – Scientific anomalies: compasses & vibration */
          mk('hs3', 6.8, 'expeditionCamp', 'tense', 'pulse', 'ANOMALÍA ELECTROMAGNÉTICA',
            'Hoy las brújulas fallan dentro del nicho y muchos sienten un extraño zumbido vibrando bajo la roca.',
            [
              archaeologist('arch1', [
                { t: 0, x: 0.48, y: 0.68, pose: 'inspect', facing: 1, expr: 'shocked', prop: 'scanner' },
                { t: 0.6, x: 0.48, y: 0.68, pose: 'cover_ears', facing: -1, expr: 'shocked', prop: 'compass' },
                { t: 1, x: 0.48, y: 0.68, pose: 'gasp', facing: 1, expr: 'shocked', prop: 'scanner' }
              ])
            ],
            [{ type: 'seismicWave', x: 0.50, y: 0.24, label: 'ZUMBIDO EN LA PIEDRA' }],
            { zoomStart: 1.02, zoomEnd: 1.18, orbitStart: -12, orbitEnd: 12, shake: 0.9 }),

          /* hs4 – Lake Titicaca blue orbs */
          mk('hs4', 6.8, 'titicacaLake', 'shock', 'sting', 'LUCES EN EL TITICACA',
            'Y pescadores del Lago Titicaca afirman haber visto esferas azules salir del agua rumbo al portal de piedra.',
            [
              andean('fish1', [
                { t: 0, x: 0.48, y: 0.68, pose: 'point_up', facing: 1, expr: 'shocked', prop: 'none' },
                { t: 1, x: 0.50, y: 0.68, pose: 'gasp', facing: -1, expr: 'shocked', prop: 'none' }
              ], '#b91c1c')
            ],
            [{ type: 'orbs', x: 0.50, y: 0.22 }],
            { zoomStart: 1.0, zoomEnd: 1.16, orbitStart: -15, orbitEnd: 15 },
            { subBg: 'lights' }),

          /* hs5 – CTA */
          mk('hs5', 6.4, 'spotlight', 'tense', 'sting', 'VIDEO COMPLETO',
            'Descubre la explicación científica real y el misterio completo del Perú en el video de cinco minutos del canal.',
            [
              detective([
                { t: 0, x: 0.38, y: 0.68, pose: 'walk', walkSpeed: 1.0, facing: 1, expr: 'curious', prop: 'none' },
                { t: 0.45, x: 0.48, y: 0.68, pose: 'point', facing: 1, expr: 'mysterious', prop: 'none', speaking: true },
                { t: 1, x: 0.50, y: 0.68, pose: 'wave', facing: 1, expr: 'curious', prop: 'none', speaking: true }
              ])
            ],
            [{ type: 'cta', x: 0.50, y: 0.23, label: 'MIRA EL VIDEO COMPLETO' }],
            { zoomStart: 1.0, zoomEnd: 1.12, orbitStart: -10, orbitEnd: 10 })
        ]
      }
    }
  });
})();
