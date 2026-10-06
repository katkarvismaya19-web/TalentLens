import Logo from "../components/Logo";
import ScoreRing from "../components/ScoreRing";

const PREVIEW = [
  { name: "Ananya Iyer", role: "Backend Developer", score: 86, skills: ["Java", "Spring Boot", "MySQL"] },
  { name: "Kabir Shah", role: "Frontend Developer", score: 74, skills: ["React", "TypeScript"] },
  { name: "Sneha Patil", role: "HR Analytics", score: 61, skills: ["Power BI", "Recruitment"] },
  { name: "Aditya Rao", role: "HR Analytics", score: 38, skills: ["Excel"] },
];

export default function AuthShell({ children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-pine px-12 py-10 text-white lg:flex lg:flex-col">
        <Logo light />
        <div className="my-auto max-w-[460px]">
          <h1 className="font-display text-[44px] font-semibold leading-[1.05] text-white">
            See who fits before you read a single resume.
          </h1>
          <p className="mt-4 max-w-md text-[17px] leading-relaxed text-white/75">
            TalentLens reads every application, scores it against the job, and tells you which employees might be thinking of leaving.
          </p>

          <ol className="mt-10 space-y-2.5" aria-label="Example of ranked applicants">
            {PREVIEW.map((p, i) => (
              <li key={p.name} className="rise flex items-center gap-4 rounded-2xl bg-white/[0.07] px-4 py-3 ring-1 ring-white/10"
                  style={{ animationDelay: `${150 + i * 110}ms` }}>
                <span className="w-4 text-sm tabular-nums text-white/50">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white">{p.name}</p>
                  <p className="truncate text-sm text-white/60">{p.role}</p>
                </div>
                <div className="flex rounded-full bg-white p-0.5">
                  <ScoreRing score={p.score} size={44} stroke={5} animate />
                </div>
              </li>
            ))}
          </ol>
        </div>
        <p className="text-sm text-white/50">Ranked by skills, experience and how closely the resume matches the job description.</p>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 lg:hidden"><Logo /></div>
          {children}
        </div>
      </section>
    </div>
  );
}
