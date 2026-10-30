// Where in the world he plays (round 17): a skyline behind the page banner whenever the career is
// outside the United States, at a youth academy, a European club or a league abroad. Each country
// gets its landmark and its landscape, drawn as silhouettes on the banner's 1200x240 canvas in the
// team colour, standing on a horizon at y = 150; Venue.tsx pixelates them like every banner.

const H0 = 150;

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** A row of town buildings between x0 and x1: flat, gabled or with a chimney. */
function town(x0: number, x1: number, lo: number, hi: number, seed: number, style: 'flat' | 'gable' | 'tower' = 'flat'): string {
  const r = rng(seed);
  let d = '';
  for (let x = x0; x < x1; ) {
    const w = 18 + Math.floor(r() * 26);
    const h = lo + Math.floor(r() * (hi - lo));
    const top = H0 - h;
    if (style === 'gable') d += `M${x} ${H0}V${top}L${x + w / 2} ${top - w * 0.45}L${x + w} ${top}V${H0}Z`;
    else d += `M${x} ${H0}V${top}H${x + w - 3}V${H0}Z`;
    if (style === 'flat' && r() < 0.4) d += `M${x + 4} ${top}v-7h4v7Z`;
    if (style === 'tower' && r() < 0.5) d += `M${x + w / 2 - 1} ${top}v-14h2v14Z`;
    x += w + (style === 'tower' ? 4 : 0);
  }
  return d;
}

const palm = (x: number, h: number, lean = 1): string => {
  const top = H0 - h;
  const tx = x + lean * h * 0.18;
  let d = `M${x - 4} ${H0}Q${x + lean * h * 0.05} ${H0 - h / 2} ${tx - 2} ${top}h5Q${x + 4 + lean * h * 0.06} ${H0 - h / 2} ${x + 4} ${H0}Z`;
  for (const [dx, dy] of [
    [-34, 10],
    [-26, -6],
    [-6, -14],
    [16, -12],
    [32, 4],
    [24, 14],
  ])
    d += `M${tx} ${top}Q${tx + dx * 0.5} ${top + dy - 10} ${tx + dx} ${top + dy}Q${tx + dx * 0.5} ${top + dy - 4} ${tx} ${top + 3}Z`;
  return d;
};
const pine = (x: number, h: number): string => `M${x - 2} ${H0}v-8h4v8ZM${x - h * 0.28} ${H0 - 8}L${x} ${H0 - h}L${x + h * 0.28} ${H0 - 8}Z`;
const acacia = (x: number, h: number): string => `M${x - 3} ${H0}L${x - 1} ${H0 - h + 10}L${x - 18} ${H0 - h + 4}h4L${x} ${H0 - h + 8}L${x + 14} ${H0 - h + 2}h4L${x + 3} ${H0 - h + 12}L${x + 4} ${H0}ZM${x - 46} ${H0 - h + 4}Q${x} ${H0 - h - 18} ${x + 46} ${H0 - h + 4}Z`;
const blob = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
/** A baobab: a fat bottle trunk, short stubby branches, tufts of leaves at their ends. */
const baobab = (x: number, h: number): string => {
  const t = H0 - h + 18;
  return (
    `M${x - 18} ${H0}C${x - 24} ${H0 - h * 0.4} ${x - 14} ${t + 10} ${x - 12} ${t}L${x - 32} ${t - 10}l4 -4L${x - 6} ${t - 4}L${x - 4} ${t - 16}h6L${x + 4} ${t - 4}L${x + 26} ${t - 14}l4 4L${x + 12} ${t}C${x + 14} ${t + 10} ${x + 24} ${H0 - h * 0.4} ${x + 18} ${H0}Z` +
    blob(x - 32, t - 14, 9) +
    blob(x - 1, t - 20, 9) +
    blob(x + 30, t - 16, 9)
  );
};
const cypress = (x: number, h: number): string => `M${x} ${H0}C${x - 10} ${H0 - h * 0.4} ${x - 6} ${H0 - h * 0.8} ${x} ${H0 - h}C${x + 6} ${H0 - h * 0.8} ${x + 10} ${H0 - h * 0.4} ${x} ${H0}Z`;
const cactus = (x: number, h: number): string => `M${x - 5} ${H0}V${H0 - h}h10V${H0}ZM${x - 5} ${H0 - h * 0.45}h-10v-${h * 0.35}h5v${h * 0.25}h5ZM${x + 5} ${H0 - h * 0.6}h10v-${h * 0.3}h-5v${h * 0.2}h-5Z`;
const mountains = (pts: [number, number][]): string => `M${pts[0][0]} ${H0}${pts.map(([x, y]) => `L${x} ${y}`).join('')}L${pts[pts.length - 1][0]} ${H0}Z`;

const Main = ({ d }: { d: string }) => <path d={d} fill="currentColor" fillRule="evenodd" opacity=".55" />;
const Back = ({ d }: { d: string }) => <path d={d} fill="currentColor" fillRule="evenodd" opacity=".28" />;

function France() {
  return (
    <>
      <Back d={town(560, 840, 26, 44, 3, 'flat') + town(960, 1200, 26, 44, 4, 'flat')} />
      <Main d="M866 150L888 94L893 58L897 24L900 8L903 24L907 58L912 94L934 150ZM883 150Q900 118 917 150ZM884 92h32v5h-32ZM890 56h20v4h-20Z" />
    </>
  );
}

function Spain() {
  const spire = (x: number, top: number) => `M${x - 7} 150L${x - 5} ${top + 40}L${x} ${top}L${x + 5} ${top + 40}L${x + 7} 150Z`;
  return (
    <>
      <Back d={town(560, 820, 22, 40, 5, 'flat') + town(1000, 1200, 22, 40, 6, 'flat')} />
      <Main d={`M842 150V100H958V150Z${spire(856, 40)}${spire(876, 22)}${spire(900, 8)}${spire(924, 22)}${spire(944, 40)}`} />
    </>
  );
}

function Serbia() {
  return (
    <>
      <Back d={town(560, 800, 24, 46, 7, 'flat') + town(1010, 1200, 24, 46, 8, 'flat')} />
      <Main d="M826 150V104H974V150ZM840 104Q900 26 960 104ZM897 44v-22h6v22ZM890 28h20v5h-20ZM812 150V118Q826 98 840 118V150ZM960 150V118Q974 98 988 118V150Z" />
    </>
  );
}

function Greece() {
  const cols = Array.from({ length: 8 }, (_, i) => `M${808 + i * 25} 110V82h10V110Z`).join('');
  return (
    <>
      <Back d="M600 150Q900 92 1200 150Z" />
      <Main d={`M796 118h208v-8H796Z${cols}M796 82h208v-8H796ZM796 74L900 52L1004 74Z`} />
    </>
  );
}

function Germany() {
  const cols = Array.from({ length: 6 }, (_, i) => `M${828 + i * 30} 150V98h10V150Z`).join('');
  return (
    <>
      <Back d={town(560, 790, 24, 44, 9, 'flat') + town(1010, 1200, 24, 44, 10, 'flat')} />
      <Main d={`${cols}M814 98h172v-12H814ZM858 86h84v-14h-84ZM890 72h20l4 -14h-28Z`} />
    </>
  );
}

function Lithuania() {
  return (
    <>
      <Back d={[600, 640, 680, 1080, 1120, 1160].map((x, i) => pine(x, 40 + (i % 3) * 10)).join('')} />
      <Main d="M740 150Q900 86 1060 150ZM878 112V58h44v54ZM878 58v-8h8v8h6v-8h8v8h6v-8h8v8h8v-8h8v8ZM899 50V28h2v22ZM901 28h18v10h-18Z" />
    </>
  );
}

function Slovenia() {
  return (
    <>
      <Back d={mountains([[560, 150], [690, 56], [780, 110], [880, 34], [990, 118], [1080, 64], [1200, 120]])} />
      <Main d="M900 150Q940 132 980 150ZM930 140V118h20v22ZM938 118L940 96L942 118Z" />
    </>
  );
}

function Turkey() {
  const minaret = (x: number) => `M${x - 3} 150V52h6V150ZM${x - 3} 52L${x} 30L${x + 3} 52ZM${x - 6} 86h12v4h-12Z`;
  return (
    <>
      <Back d={town(560, 760, 18, 34, 11, 'flat') + 'M560 150h640v-4H560Z'} />
      <Main d={`M808 150V118H992V150ZM826 118Q900 46 974 118ZM897 64v-14h6v14ZM808 118Q830 96 852 118ZM948 118Q970 96 992 118Z${minaret(772)}${minaret(792)}${minaret(1008)}${minaret(1028)}`} />
    </>
  );
}

function Italy() {
  let arches = '';
  for (let row = 0; row < 3; row++) for (let i = 0; i < 9; i++) arches += `M${772 + i * 30} ${140 - row * 24}v-10q7 -9 14 0v10Z`;
  return (
    <>
      <Back d={[620, 660, 700, 1100, 1140].map((x, i) => cypress(x, 50 + (i % 2) * 18)).join('')} />
      <Main d={`M760 150V74L1030 64L1040 72V150Z${arches}`} />
    </>
  );
}

function Israel() {
  return (
    <>
      <Back d={town(560, 780, 30, 70, 12, 'tower') + palm(1150, 70, -1)} />
      <Main d={`M820 150V44h40V150ZM880 150V60L930 32V150ZM950 150V52h40V150Z${palm(1060, 60)}`} />
    </>
  );
}

function Monaco() {
  return (
    <>
      <Back d="M560 150Q720 40 880 112Q1040 54 1200 150Z" />
      <Main d={`${town(700, 1020, 18, 40, 13, 'flat')}M760 146h56l-6 4h-46ZM860 146h80l-8 4h-66ZM990 146h48l-6 4h-38ZM884 146V120l26 26Z`} />
    </>
  );
}

function Argentina() {
  return (
    <>
      <Back d={town(560, 860, 30, 64, 14, 'flat') + town(940, 1200, 30, 64, 15, 'flat')} />
      <Main d="M886 150L890 34L900 18L910 34L914 150ZM893 64h14v3h-14Z" />
    </>
  );
}

function Australia() {
  const hangers = Array.from({ length: 9 }, (_, i) => `M${1000 + i * 20} 118v-${Math.round(40 * Math.sin((Math.PI * (i + 1)) / 10))}h2V118Z`).join('');
  return (
    <>
      <Back d={`M980 150Q1090 52 1200 150h-10Q1090 66 990 150ZM980 118h220v5H980Z${hangers}`} />
      <Main d="M780 150h180v-10H780ZM790 140Q808 84 852 72L844 140ZM846 140Q866 74 912 68L900 140ZM902 140Q920 92 952 88L948 140Z" />
    </>
  );
}

function Nigeria() {
  return (
    <>
      <Back d={town(560, 780, 30, 70, 16, 'tower') + palm(1160, 64, -1)} />
      <Main d={`${town(800, 1060, 40, 104, 17, 'tower')}${palm(1100, 72)}`} />
    </>
  );
}

function Senegal() {
  return (
    <>
      <Back d={`${palm(620, 64)}${palm(680, 56, -1)}M560 150h640v-4H560Z`} />
      <Main d={`${baobab(880, 96)}${baobab(1080, 76)}M760 146h70l-10 4h-50Z`} />
    </>
  );
}

function Cameroon() {
  return (
    <>
      <Back d={mountains([[600, 150], [760, 64], [860, 40], [960, 72], [1120, 150]])} />
      <Main d={`${palm(720, 70)}${palm(1060, 78, -1)}${palm(1110, 60)}`} />
    </>
  );
}

function SouthSudan() {
  return (
    <>
      <Back d="M1080 60a22 22 0 1 0 0.1 0Z M560 150h640v-6H560Z" />
      <Main d={`${acacia(820, 84)}${acacia(980, 66)}${acacia(1140, 56)}`} />
    </>
  );
}

function Caribbean() {
  return (
    <>
      <Back d="M560 150h640v-5H560ZM1040 140h60l-8 6h-44ZM1068 140V98l24 42Z" />
      <Main d={`${palm(780, 92)}${palm(860, 74, -1)}${palm(960, 84)}M700 150V110h60V150ZM716 110V96h28v14Z`} />
    </>
  );
}

function Brazil() {
  return (
    <>
      <Back d="M1000 150Q1010 70 1060 60Q1110 66 1120 150ZM940 150Q960 110 990 108Q1010 112 1010 150Z" />
      <Main d="M720 150L860 48L900 40L940 52L1000 150ZM897 40V14h6v26ZM884 20h32v5h-32Z" />
    </>
  );
}

function Mexico() {
  let tiers = '';
  for (let i = 0; i < 5; i++) tiers += `M${800 + i * 16} ${150 - i * 18}h${200 - i * 32}v-18H${800 + i * 16}Z`;
  return (
    <>
      <Back d={`${cactus(640, 60)}${cactus(1130, 70)}M892 150V60h16V150Z`} />
      <Main d={`${tiers}M880 60h40v-16h-40Z`} />
    </>
  );
}

function Japan() {
  let pagoda = '';
  for (let i = 0; i < 5; i++) pagoda += `M${748 + i * 5} ${146 - i * 20}h${64 - i * 10}l-6 -6h${-(52 - i * 10)}Z M${756 + i * 5} ${140 - i * 20}h${48 - i * 10}v-14h${-(48 - i * 10)}Z`;
  return (
    <>
      <Back d="M840 150L960 52Q980 44 1000 52L1120 150Z" />
      <Main d={`${pagoda}M778 46h4v-16h-4ZM1040 150V96h8V150ZM1090 150V96h8V150ZM1028 96h82l4 -8h-90ZM1034 104h76v-4h-76Z`} />
    </>
  );
}

function SouthKorea() {
  return (
    <>
      <Back d={`M680 150Q840 98 1000 150Z${town(560, 680, 20, 40, 18, 'flat')}`} />
      <Main d="M836 120V58h8V120ZM822 58Q840 42 858 58Q840 68 822 58ZM839 42V22h2v20ZM1000 150V110h120V150ZM980 112Q1060 88 1140 112L1128 104Q1060 84 992 104Z" />
    </>
  );
}

function China() {
  let wall = 'M560 132L640 118L720 128L800 112';
  for (let x = 560; x < 800; x += 12) wall += `M${x} ${132 - ((x - 560) / 240) * 20}h6v-6h-6Z`;
  return (
    <>
      <Back d={`M560 150V132L640 118L720 128L800 112V150Z${wall}M636 118h14v-18h-14Z`} />
      <Main d="M840 150V136h120V150ZM852 136V118h96V136ZM840 118Q900 96 960 118ZM862 104V92h76V104ZM852 92Q900 72 948 92ZM872 78V66h56V78ZM866 66Q900 46 934 66ZM898 48v-10h4v10Z" />
    </>
  );
}

function Philippines() {
  return (
    <>
      <Back d="M880 150L1000 46Q1010 40 1020 46L1140 150Z" />
      <Main d={`${palm(760, 82)}${palm(830, 64, -1)}M900 150V128h50V150ZM892 128L925 106L958 128ZM1150 150V132h40V150ZM1144 132L1170 116L1196 132Z`} />
    </>
  );
}

function Canada() {
  return (
    <>
      <Back d={town(560, 820, 30, 80, 19, 'tower') + town(980, 1100, 30, 70, 20, 'tower')} />
      <Main d={`M892 150L895 64L897 40L899 14H901L903 40L905 64L908 150ZM884 66Q900 52 916 66Q900 78 884 66Z${pine(1140, 60)}${pine(1180, 48)}`} />
    </>
  );
}

function OldTown() {
  return (
    <>
      <Back d={town(560, 1200, 20, 40, 21, 'gable')} />
      <Main d="M880 150V80h40V150ZM880 80L900 22L920 80Z" />
    </>
  );
}

function Savannah() {
  return (
    <>
      <Back d="M1100 64a20 20 0 1 0 0.1 0ZM560 150h640v-6H560Z" />
      <Main d={`${baobab(820, 88)}${acacia(1000, 70)}`} />
    </>
  );
}

function Tropics() {
  return (
    <>
      <Back d={mountains([[600, 150], [740, 70], [860, 104], [980, 54], [1120, 150]])} />
      <Main d={`${palm(800, 86)}${palm(1060, 74, -1)}`} />
    </>
  );
}

const PLACES: Record<string, () => JSX.Element> = {
  France,
  Spain,
  Serbia,
  Greece,
  Germany,
  Lithuania,
  Slovenia,
  Turkey,
  Italy,
  Israel,
  Monaco,
  Argentina,
  Australia,
  Nigeria,
  Senegal,
  Cameroon,
  'South Sudan': SouthSudan,
  'Dominican Republic': Caribbean,
  Brazil,
  Mexico,
  Japan,
  'South Korea': SouthKorea,
  China,
  Philippines,
  Canada,
  Europe: OldTown,
  Africa: Savannah,
  Americas: Tropics,
};

export const hasPlace = (place: string | null | undefined): place is string => !!place && place in PLACES;

/** The skyline of a country or region, over the banner's horizon. */
export function Landmarks({ place }: { place: string }) {
  const P = PLACES[place];
  return P ? <P /> : null;
}
