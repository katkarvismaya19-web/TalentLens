import { Link } from "react-router-dom";
import Logo from "../components/Logo";

const CONTACT = "katkarvismaya19@gmail.com";
const UPDATED = "6 October 2026";

function Page({ title, children }) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link to="/login" aria-label="TalentLens home"><Logo /></Link>
          <nav className="flex gap-4 text-sm font-medium text-muted">
            <Link to="/privacy" className="hover:text-ink">Privacy</Link>
            <Link to="/terms" className="hover:text-ink">Terms</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="text-[32px] font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted">Last updated {UPDATED}</p>
        <div className="mt-8 max-w-[68ch] space-y-6 leading-[1.7] [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_a]:font-semibold [&_a]:text-pine">
          {children}
        </div>
      </main>
    </div>
  );
}

export function Privacy() {
  return (
    <Page title="Privacy policy">
      <p>TalentLens is a recruitment and employee-retention tool. This page explains what information it collects, why, and what you can do about it.</p>

      <h2>What we collect</h2>
      <p>When you create a candidate account: your name and email address, or your phone number if you sign in with one. If you sign in with Google or Microsoft, we receive only your name, email address and profile picture from that provider. We never receive your Google or Microsoft password.</p>
      <p>When you apply for a job: the resume file you upload, the text in it, and any note you add. The resume is read automatically to find skills, experience and education, and compared with the job description to produce a match score for the hiring team.</p>
      <p>For HR team members: name, work email and an HR ID used to sign in. HR may also enter employee records (such as role, salary band and satisfaction scores) to estimate attrition risk.</p>
      <p>We keep a log of sign-ins and changes for security.</p>

      <h2>How it's used</h2>
      <p>Only to run the hiring process and the features described on this site: showing your application to the company's HR team, scheduling interviews, and sending you updates by email or SMS. We don't sell your data, show ads, or share it with anyone outside the hiring company and the services that host the app.</p>

      <h2>Where it's stored</h2>
      <p>On the app's hosting provider and its database provider. Passwords are stored only as secure hashes, sign-in codes are stored only as hashes, and connections are encrypted.</p>

      <h2>Your choices</h2>
      <p>You can ask for a copy of your data, or for your account and applications to be deleted, by emailing <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. You can also remove TalentLens' access from your Google or Microsoft account settings at any time.</p>

      <h2>Contact</h2>
      <p>Questions about this policy: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
    </Page>
  );
}

export function Terms() {
  return (
    <Page title="Terms of service">
      <p>By using TalentLens you agree to these terms.</p>

      <h2>The service</h2>
      <p>TalentLens helps a company's HR team manage hiring and retention, and lets candidates apply for that company's jobs. It's provided as is, and features may change.</p>

      <h2>Your account</h2>
      <p>Keep your password and HR ID private. You're responsible for activity on your account. HR accounts are for the hiring company's staff only.</p>

      <h2>What you upload</h2>
      <p>Only upload resumes and information that are yours, or that you're allowed to share, and that are accurate. Don't upload anything unlawful or harmful.</p>

      <h2>Automated scores</h2>
      <p>Match scores and attrition-risk estimates are suggestions to help people decide. They are not final decisions, and the HR team remains responsible for every hiring and people decision.</p>

      <h2>Contact</h2>
      <p>Questions: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. See also our <Link to="/privacy">privacy policy</Link>.</p>
    </Page>
  );
}
