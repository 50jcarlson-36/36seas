import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BookCheck,
  BookOpen,
  Building2,
  Check,
  Feather,
  FileCheck2,
  Layers3,
  Palette,
  PenLine,
  Quote,
  ScanText,
  ShieldCheck,
  Sparkles,
  Users,
  Waves,
} from "lucide-react";
import LandingPricing from "@/components/LandingPricing";

const CROSSINGS = [
  {
    number: "01",
    icon: Feather,
    title: "Find the book",
    body: "Begin with a premise, a rough outline, or a finished draft. Build the structure, characters, and chapters without losing your voice.",
  },
  {
    number: "02",
    icon: ScanText,
    title: "Strengthen the manuscript",
    body: "Get developmental intelligence on structure, pacing, character, clarity, readability, and market position—then decide what to revise.",
  },
  {
    number: "03",
    icon: Palette,
    title: "Give it a face",
    body: "Direct cover concepts around genre, audience, tone, and competitive shelf context. Refine the strongest direction for your edition.",
  },
  {
    number: "04",
    icon: Layers3,
    title: "Build every edition",
    body: "Create EPUB, print-ready interiors, and measured paperback or hardcover wraps with the spine and bleed handled correctly.",
  },
  {
    number: "05",
    icon: FileCheck2,
    title: "Choose the publishing path",
    body: "Leave with a complete self-publishing package—or submit a qualified manuscript for selective editorial review by 36Seas Publishing.",
  },
];

const IMPRINT_STEPS = [
  ["01", "Finish to a professional standard", "Strengthen the manuscript, cover, formats, metadata, and market position inside the studio."],
  ["02", "Submit for editorial review", "Ask 36Seas to evaluate the work, its audience, its readiness, and its fit with the publishing list."],
  ["03", "Build the release with people", "Selected projects move into a defined editorial, production, packaging, and publication plan."],
  ["04", "Publish under the 36Seas imprint", "Approved books can carry a real publishing-house identity, governed by a separate publishing agreement."],
] as const;

const CAPABILITIES = [
  ["Story Builder", "Turn the book in your head into a working outline and chapter plan.", PenLine],
  ["Editorial Review", "See the structural and line-level decisions that will make the draft stronger.", ScanText],
  ["Cover Studio", "Explore art direction built around readers, genre, promise, and shelf impact.", Palette],
  ["Book Production", "Generate clean digital and print editions for the formats readers buy.", Layers3],
  ["Submission Packager", "Bring every publishing file and decision together before the final upload.", BookCheck],
  ["36Seas Experts", "Add a real editor or managed publishing team when human judgment matters most.", Users],
] as const;

export default function Home() {
  return (
    <main className="landing overflow-hidden bg-[#07090b] text-[#f6f0e6]">
      <header className="relative z-30 border-b border-[#d0a45d]/20 bg-[#07090b]/90 px-5 backdrop-blur-xl sm:px-10 lg:px-16">
        <div className="mx-auto flex h-20 max-w-[1500px] items-center justify-between">
          <Link href="/" className="flex items-center gap-3" aria-label="36Seas Publishing Manuscript Studio home">
            <Waves className="text-[#d0a45d]" size={31} strokeWidth={1.5} aria-hidden="true" />
            <span>
              <span className="block font-display text-lg tracking-[0.22em] text-[#e0bb76]">36SEAS</span>
              <span className="block text-[9px] font-semibold tracking-[0.36em] text-[#b8aa94]">PUBLISHING</span>
            </span>
          </Link>
          <nav className="flex items-center gap-3 text-sm sm:gap-7" aria-label="Primary navigation">
            <a href="#studio" className="hidden text-[#b8aa94] transition hover:text-white md:block">The studio</a>
            <a href="#imprint" className="hidden text-[#b8aa94] transition hover:text-white md:block">36Seas imprint</a>
            <a href="#experts" className="hidden text-[#b8aa94] transition hover:text-white xl:block">Human services</a>
            <a href="#pricing" className="hidden text-[#b8aa94] transition hover:text-white md:block">Pricing</a>
            <Link href="/login" className="hidden text-[#ded6c8] transition hover:text-white sm:block">Sign in</Link>
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 bg-[#d0a45d] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-[#15110b] transition hover:bg-[#e2bd77] sm:px-5"
            >
              Get started free <ArrowRight size={14} className="transition group-hover:translate-x-1" />
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative isolate min-h-[790px] border-b border-[#d0a45d]/15 px-5 py-20 sm:px-10 lg:px-16 lg:py-28">
        <div className="landing-orbit landing-orbit-one" aria-hidden="true" />
        <div className="landing-orbit landing-orbit-two" aria-hidden="true" />
        <div className="landing-glow" aria-hidden="true" />
        <div className="relative z-10 mx-auto grid max-w-[1500px] gap-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.28em] text-[#d0a45d]">
              <span className="h-px w-9 bg-[#d0a45d]" /> The author studio by 36Seas
            </p>
            <h1 className="mt-7 max-w-4xl text-[clamp(3.6rem,7.2vw,8.5rem)] font-black uppercase leading-[0.78] tracking-[-0.06em]">
              Your book.
              <span className="mt-4 block font-display text-[0.69em] font-normal italic normal-case tracking-[-0.04em] text-[#d0a45d]">
                Made real.
              </span>
            </h1>
            <p className="mt-9 max-w-xl text-base leading-8 text-[#b8b0a4] sm:text-lg">
              Write, review, design, format, and prepare your book for publication in one focused studio—
              powered by AI, shaped by your judgment, and backed by a real publishing company that can take selected work all the way to the 36Seas imprint.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="group inline-flex items-center justify-center gap-3 bg-[#d0a45d] px-7 py-4 text-sm font-bold uppercase tracking-[0.12em] text-[#15110b] transition hover:bg-[#e2bd77]"
              >
                Get started free <ArrowRight size={17} className="transition group-hover:translate-x-1" />
              </Link>
              <a
                href="#crossing"
                className="inline-flex items-center justify-center gap-3 border border-[#7c6a4d] px-7 py-4 text-sm font-bold uppercase tracking-[0.12em] text-[#eee7db] transition hover:border-[#d0a45d] hover:bg-[#d0a45d]/5"
              >
                See the crossing
              </a>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs uppercase tracking-[0.13em] text-[#857f76]">
              <span className="flex items-center gap-2"><Check size={14} className="text-[#d0a45d]" /> Start free</span>
              <span className="flex items-center gap-2"><Check size={14} className="text-[#d0a45d]" /> Keep your rights</span>
              <span className="flex items-center gap-2"><Check size={14} className="text-[#d0a45d]" /> Self-publish or pursue the imprint</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[760px]">
            <div className="absolute -inset-8 bg-[radial-gradient(circle,rgba(208,164,93,0.11),transparent_68%)] blur-2xl" aria-hidden="true" />
            <div className="relative border border-[#d0a45d]/30 bg-[#0d1013]/92 p-3 shadow-[0_35px_100px_rgba(0,0,0,0.55)] sm:p-5">
              <div className="flex items-center justify-between border-b border-[#d0a45d]/15 px-2 pb-4 text-[10px] uppercase tracking-[0.2em] text-[#7f796f]">
                <span>Book project · in progress</span>
                <span className="flex items-center gap-2 text-[#d0a45d]"><span className="landing-live-dot h-1.5 w-1.5 rounded-full bg-[#d0a45d]" /> Live studio</span>
              </div>
              <div className="grid min-h-[470px] sm:grid-cols-[0.7fr_1.3fr]">
                <div className="border-b border-[#d0a45d]/15 p-5 sm:border-r sm:border-b-0">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[#d0a45d]">The crossing</p>
                  <div className="mt-6 space-y-5">
                    {["Idea & outline", "Draft & revise", "Cover direction", "Book formats", "Publish package"].map((step, index) => (
                      <div key={step} className="flex items-center gap-3">
                        <span className={`flex h-7 w-7 items-center justify-center border text-[10px] ${index < 2 ? "border-[#d0a45d] bg-[#d0a45d] text-black" : "border-[#3b3b38] text-[#77736b]"}`}>
                          {index < 2 ? <Check size={12} /> : String(index + 1).padStart(2, "0")}
                        </span>
                        <span className={index < 2 ? "text-sm text-[#ece4d8]" : "text-sm text-[#77736b]"}>{step}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-10 border-t border-[#d0a45d]/15 pt-5">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#77736b]">Book intelligence</p>
                    <div className="mt-3 h-1.5 overflow-hidden bg-[#202226]"><div className="landing-progress h-full w-[68%] bg-[#d0a45d]" /></div>
                    <p className="mt-2 text-xs text-[#9e978c]">Voice and structure aligned</p>
                  </div>
                </div>
                <div className="relative p-6 sm:p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[#79746c]">Chapter 07</p>
                      <h2 className="font-display mt-2 text-2xl text-[#f4ede2]">The Water Between</h2>
                    </div>
                    <Sparkles size={20} className="text-[#d0a45d]" />
                  </div>
                  <div className="mt-8 space-y-4 text-sm leading-7 text-[#9f9a92]">
                    <p>The first crossing was never about distance. It was about deciding which version of the story deserved to reach the other shore.</p>
                    <p>Every page carried a choice: sharpen the voice, reveal the truth, or let the current take it somewhere easier.</p>
                    <p className="landing-typing text-[#e6ded2]">The book became clearer when the author stopped asking what the machine could write—and started directing what the reader needed to feel.</p>
                  </div>
                  <div className="mt-9 grid grid-cols-3 gap-2">
                    {[["82", "readability"], ["Strong", "voice"], ["Ready", "structure"]].map(([value, label]) => (
                      <div key={label} className="border border-[#292b2d] bg-[#111417] p-3">
                        <p className="text-sm font-semibold text-[#d0a45d]">{value}</p>
                        <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-[#6f6b65]">{label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="absolute bottom-0 right-0 h-24 w-24 border-r border-b border-[#d0a45d]/30" aria-hidden="true" />
                </div>
              </div>
            </div>
            <div className="absolute -bottom-6 left-7 flex items-center gap-3 border border-[#d0a45d]/30 bg-[#111316] px-4 py-3 shadow-xl sm:left-auto sm:right-8">
              <ShieldCheck size={17} className="text-[#d0a45d]" />
              <span className="text-[10px] uppercase tracking-[0.17em] text-[#bdb5a8]">AI speed · author control · expert support</span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#d0a45d]/15 bg-[#0b0d0f] px-5 sm:px-10 lg:px-16">
        <div className="mx-auto grid max-w-[1500px] divide-y divide-[#d0a45d]/15 md:grid-cols-3 md:divide-y-0 md:divide-x">
          {[
            ["One studio", "From the first idea through the final publishing decision"],
            ["Your rights", "Your manuscript, files, decisions, and publishing future"],
            ["A real imprint", "A selective path to publication under 36Seas Publishing"],
          ].map(([title, body]) => (
            <div key={title} className="px-6 py-8 first:pl-0 last:pr-0 lg:px-10">
              <p className="font-display text-xl text-[#d0a45d]">{title}</p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-[#8d887f]">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="crossing" className="px-5 py-24 sm:px-10 lg:px-16 lg:py-32">
        <div className="mx-auto max-w-[1500px]">
          <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#d0a45d]">From idea to edition</p>
              <h2 className="mt-5 max-w-3xl text-5xl font-black uppercase leading-[0.86] tracking-[-0.045em] sm:text-7xl">
                Five crossings.
                <span className="block font-display font-normal italic normal-case text-[#d0a45d]">One clear journey.</span>
              </h2>
            </div>
            <p className="max-w-xl text-base leading-8 text-[#99938a] lg:justify-self-end">
              Most authors stitch together a writing app, an editor, a cover tool, a formatter, and a maze of upload checklists. 36Seas keeps the book—and every decision around it—in one continuous flow.
            </p>
          </div>
          <div className="mt-16 border-t border-[#d0a45d]/25">
            {CROSSINGS.map(({ number, icon: Icon, title, body }) => (
              <article key={number} className="group grid gap-4 border-b border-[#302b23] py-8 transition hover:bg-[#d0a45d]/[0.035] sm:grid-cols-[80px_65px_0.65fr_1fr] sm:items-center sm:px-4 lg:py-10">
                <span className="text-xs tracking-[0.18em] text-[#6e6659]">{number}</span>
                <Icon size={25} strokeWidth={1.4} className="text-[#d0a45d] transition group-hover:scale-110" />
                <h3 className="font-display text-2xl sm:text-3xl">{title}</h3>
                <p className="max-w-xl text-sm leading-7 text-[#918b82]">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="imprint" className="relative border-y border-[#d0a45d]/20 bg-[#e9dfce] px-5 py-24 text-[#15120d] sm:px-10 lg:px-16 lg:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(159,111,39,0.14),transparent_34%)]" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1500px]">
          <div className="grid gap-9 border-b border-[#765d35]/30 pb-14 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
            <div>
              <p className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.28em] text-[#8c6425]">
                <Building2 size={17} strokeWidth={1.6} /> The 36Seas difference
              </p>
              <h2 className="mt-5 max-w-4xl text-5xl font-black uppercase leading-[0.86] tracking-[-0.05em] sm:text-7xl">
                Most tools stop
                <span className="font-display block font-normal italic normal-case text-[#8c6425]">when the files are finished.</span>
              </h2>
            </div>
            <div className="max-w-2xl lg:justify-self-end">
              <p className="text-xl leading-9 text-[#4f473b] sm:text-2xl">
                36Seas gives authors another destination: a selective route from a finished book to a professionally published 36Seas title.
              </p>
              <p className="mt-5 text-sm leading-7 text-[#706555]">
                Keep complete self-publishing freedom, or ask a publishing team to consider the work for its list. The book does not have to end as a folder of export files and a checklist you face alone.
              </p>
            </div>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
            <aside className="border border-[#796744]/35 bg-[#ded2bd] p-7 sm:p-9">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#756243]">The standard software ending</p>
              <h3 className="mt-5 text-3xl font-black uppercase leading-none tracking-[-0.035em] sm:text-4xl">Here are your files.<br />Good luck publishing.</h3>
              <div className="mt-8 space-y-4 border-t border-[#796744]/30 pt-7 text-sm text-[#62594b]">
                {["A completed manuscript", "A cover and formatted editions", "Metadata and upload guidance", "A do-it-yourself publishing handoff"].map((item) => (
                  <p key={item} className="flex items-center gap-3"><Check size={15} className="text-[#8c6425]" /> {item}</p>
                ))}
              </div>
              <p className="font-display mt-9 border-l-2 border-[#8c6425] pl-4 text-xl italic text-[#554936]">
                Useful tools. But the author still crosses the final distance alone.
              </p>
            </aside>

            <div className="border border-[#d0a45d]/35 bg-[#090b0d] p-7 text-[#f6f0e6] shadow-[0_28px_80px_rgba(48,34,15,0.2)] sm:p-10 lg:p-12">
              <div className="flex flex-col gap-4 border-b border-[#d0a45d]/25 pb-8 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#d0a45d]">The publisher-backed crossing</p>
                  <h3 className="mt-3 text-3xl font-black uppercase tracking-[-0.035em] sm:text-5xl">From your book to our imprint.</h3>
                </div>
                <span className="inline-flex w-fit items-center gap-2 border border-[#d0a45d]/45 bg-[#d0a45d]/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.17em] text-[#e0bb76]">
                  <BadgeCheck size={15} /> Selective pathway
                </span>
              </div>

              <div className="mt-2">
                {IMPRINT_STEPS.map(([number, title, body]) => (
                  <article key={number} className="grid gap-3 border-b border-[#302b23] py-7 sm:grid-cols-[48px_0.72fr_1fr] sm:items-start">
                    <span className="text-xs font-bold tracking-[0.18em] text-[#d0a45d]">{number}</span>
                    <h4 className="text-base font-bold uppercase leading-6 tracking-[-0.01em] text-[#f3ecdf]">{title}</h4>
                    <p className="text-sm leading-7 text-[#9b9489]">{body}</p>
                  </article>
                ))}
              </div>

              <div className="mt-9 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="font-display text-2xl text-[#e0bb76]">Build it here. Then give it the chance to go farther.</p>
                  <p className="mt-2 max-w-2xl text-xs leading-6 text-[#777168]">Publication is not automatic. Imprint consideration requires editorial approval, commercial fit, and a separate publishing agreement.</p>
                </div>
                <Link href="/signup" className="group inline-flex shrink-0 items-center justify-center gap-3 bg-[#d0a45d] px-6 py-4 text-xs font-black uppercase tracking-[0.13em] text-[#15110b] transition hover:bg-[#e2bd77]">
                  Start the publishing journey <ArrowRight size={16} className="transition group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="studio" className="relative border-y border-[#d0a45d]/15 bg-[#0d1013] px-5 py-24 sm:px-10 lg:px-16 lg:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(208,164,93,0.09),transparent_42%)]" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1500px]">
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.28em] text-[#d0a45d]">A book studio in your browser</p>
          <h2 className="mx-auto mt-5 max-w-4xl text-center text-5xl font-black uppercase leading-[0.9] tracking-[-0.045em] sm:text-7xl">
            Everything the book needs.
            <span className="font-display block font-normal italic normal-case text-[#d0a45d]">Nothing that gets in its way.</span>
          </h2>
          <div className="mt-16 grid border-l border-t border-[#342f27] md:grid-cols-2 xl:grid-cols-3">
            {CAPABILITIES.map(([title, body, Icon], index) => (
              <article key={title} className="group min-h-64 border-r border-b border-[#342f27] p-7 transition duration-300 hover:bg-[#d0a45d]/[0.05] lg:p-9">
                <div className="flex items-center justify-between">
                  <Icon size={25} strokeWidth={1.4} className="text-[#d0a45d]" />
                  <span className="text-[10px] tracking-[0.18em] text-[#5f5b54]">0{index + 1}</span>
                </div>
                <h3 className="font-display mt-10 text-2xl">{title}</h3>
                <p className="mt-4 max-w-sm text-sm leading-7 text-[#918b82]">{body}</p>
                <div className="mt-6 h-px w-8 bg-[#d0a45d] transition-all duration-300 group-hover:w-20" />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="experts" className="px-5 py-24 sm:px-10 lg:px-16 lg:py-32">
        <div className="mx-auto grid max-w-[1500px] gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="relative min-h-[570px] overflow-hidden border border-[#d0a45d]/25 bg-[#0c0e10] p-7 sm:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(208,164,93,0.18),transparent_30%),linear-gradient(145deg,transparent,#070809)]" />
            <Quote className="relative text-[#d0a45d]" size={34} strokeWidth={1.2} />
            <blockquote className="relative mt-12 max-w-xl font-display text-3xl leading-tight sm:text-5xl">
              The fastest way to finish a book is not to remove the author. It is to remove the friction around the author.
            </blockquote>
            <div className="relative mt-12 flex items-center gap-4 border-t border-[#d0a45d]/20 pt-7">
              <div className="flex h-11 w-11 items-center justify-center border border-[#d0a45d]/45 bg-[#d0a45d]/10"><Waves size={22} className="text-[#d0a45d]" /></div>
              <div>
                <p className="text-sm font-semibold">The 36Seas approach</p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#756f65]">Technology where it accelerates · people where judgment matters</p>
              </div>
            </div>
            <div className="landing-swell absolute -bottom-24 -right-16 h-64 w-64 rounded-full border border-[#d0a45d]/15" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#d0a45d]">AI assisted. Publisher backed.</p>
            <h2 className="mt-5 text-5xl font-black uppercase leading-[0.88] tracking-[-0.045em] sm:text-7xl">
              Move fast.
              <span className="font-display block font-normal italic normal-case text-[#d0a45d]">Keep the human standard.</span>
            </h2>
            <p className="mt-7 max-w-xl text-base leading-8 text-[#9d978e]">
              The studio gives you speed and visibility. When the stakes rise, 36Seas can add a human manuscript evaluation, final publication-package review, a managed writing and editorial team, or selective consideration for the 36Seas publishing list.
            </p>
            <div className="mt-9 space-y-5">
              {[
                ["Human manuscript evaluation", "A real editor reads the work and returns a decision-ready editorial letter."],
                ["Publication readiness review", "A professional checks the files, cover, metadata, and KDP package before you upload."],
                ["Managed writing engagements", "A vetted global writing team, clear milestones, editorial oversight, NDA, and rights assignment."],
              ].map(([title, body]) => (
                <div key={title} className="grid grid-cols-[28px_1fr] gap-3 border-t border-[#2f2b24] pt-5">
                  <Check size={18} className="mt-1 text-[#d0a45d]" />
                  <div><h3 className="font-display text-xl">{title}</h3><p className="mt-2 text-sm leading-6 text-[#8e8981]">{body}</p></div>
                </div>
              ))}
            </div>
            <Link href="/signup" className="group mt-9 inline-flex items-center gap-3 border-b border-[#d0a45d] pb-2 text-sm font-bold uppercase tracking-[0.13em] text-[#d0a45d]">
              Build with expert backup <ArrowRight size={16} className="transition group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      <LandingPricing />

      <section className="relative px-5 py-28 text-center sm:px-10 lg:px-16 lg:py-40">
        <div className="landing-orbit landing-orbit-three" aria-hidden="true" />
        <div className="relative mx-auto max-w-5xl">
          <BookOpen className="mx-auto text-[#d0a45d]" size={34} strokeWidth={1.2} />
          <p className="mt-7 text-[11px] font-bold uppercase tracking-[0.28em] text-[#d0a45d]">The other shore is closer than it looks</p>
          <h2 className="mt-5 text-5xl font-black uppercase leading-[0.88] tracking-[-0.05em] sm:text-8xl">
            The book is yours.
            <span className="font-display block font-normal italic normal-case text-[#d0a45d]">Let’s get it there.</span>
          </h2>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-[#969087]">Start with a premise or bring the manuscript you already have. Your first crossing is free.</p>
          <Link href="/signup" className="group mt-9 inline-flex items-center gap-3 bg-[#d0a45d] px-8 py-4 text-sm font-black uppercase tracking-[0.13em] text-[#15110b] transition hover:bg-[#e2bd77]">
            Get started free <ArrowRight size={17} className="transition group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#d0a45d]/20 bg-[#050607] px-5 py-10 sm:px-10 lg:px-16">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-6 text-xs text-[#716c64] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><Waves size={22} className="text-[#d0a45d]" /><span className="uppercase tracking-[0.18em]">36Seas Publishing · Stories worth crossing oceans for</span></div>
          <div className="flex flex-wrap gap-5">
            <Link href="https://36seas.com/company/" className="hover:text-white">Company</Link>
            <Link href="https://36seas.com/privacy/" className="hover:text-white">Privacy</Link>
            <Link href="https://36seas.com/terms/" className="hover:text-white">Terms</Link>
            <Link href="/login" className="hover:text-white">Sign in</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
