import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  BriefcaseBusiness,
  Bell,
  Check,
  ChevronRight,
  Clock3,
  Compass,
  Grid2X2,
  Heart,
  Home,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageCircle,
  Play,
  Phone,
  PhoneOff,
  Plus,
  Search,
  Send,
  ShoppingBag,
  ShieldCheck,
  Sparkles,
  SlidersHorizontal,
  Star,
  Store,
  UsersRound,
  UserRound,
  Video,
  X,
} from 'lucide-react';
import NotFound from '@/pages/not-found';
import { GigRow, StudentProfileRow, supabase, supabaseConfigured } from '@/lib/supabase';

const queryClient = new QueryClient();

type View = 'home' | 'explore' | 'messages' | 'profile' | 'poster';
type Modal = { kind: 'post' | 'pitch' | 'creator'; id?: string } | null;
type ProfileActivityFilter = 'all' | 'posted' | 'applied';
type ProfileSection = 'grid' | 'activity' | 'skills' | 'saved' | 'worked';
type StudentProfile = { name: string; handle: string; phone: string; email: string; location: string; university: string; bio: string; skills: string[] };

type GigType = 'Online' | 'Offline' | 'Trade' | 'Collaborate';
type Gig = {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  poster: string;
  campus: string;
  budget: string;
  deadline: string;
  category: string;
  tags: string[];
  types: GigType[];
  applicants: number;
  status: string;
};

type Creator = {
  handle: string;
  name: string;
  campus: string;
  rating: number;
  skills: string[];
  completedProjects: number;
  avatarColor: string;
};

const creators: Creator[] = [
  { handle: '@rileyframes', name: 'Riley Martinez', campus: 'Woxsen University', rating: 4.9, skills: ['Short-form video', 'Motion design', 'Storyboards'], completedProjects: 27, avatarColor: '#ed7da6' },
  { handle: '@noahmakes', name: 'Noah Williams', campus: 'Woxsen University', rating: 4.8, skills: ['Brand systems', 'Illustration', 'Figma'], completedProjects: 19, avatarColor: '#80d1c1' },
  { handle: '@mina.codes', name: 'Mina Park', campus: 'Woxsen University', rating: 5.0, skills: ['React', 'Webflow', 'Prototyping'], completedProjects: 31, avatarColor: '#e9c754' },
];

const reels = [
  { title: 'How I made a poster people actually kept', creator: '@noahmakes', category: 'Design diary', accentColor: '#e9b8c4', stat: '2.4k views' },
  { title: 'The ₹1,200 thrift flip that sold in 4 hours', creator: '@camillefits', category: 'Side quest', accentColor: '#80d1c1', stat: '1.8k views' },
  { title: 'Three hooks for your next campus reel', creator: '@rileyframes', category: 'Creator tips', accentColor: '#f0c85b', stat: '940 views' },
  { title: 'My tiny studio setup between classes', creator: '@mina.codes', category: 'Behind the scenes', accentColor: '#d7b5ed', stat: '1.2k views' },
];

const stories = [
  { id: 's1', creator: 'Riley', handle: '@rileyframes', title: 'A cut from today’s campus shoot', detail: 'Shot, edited, and delivered before the next lecture.', color: '#ef4c91', time: '2h' },
  { id: 's2', creator: 'Noah', handle: '@noahmakes', title: 'Fresh from the print table', detail: 'New color tests for the student festival poster.', color: '#80d1c1', time: '4h' },
  { id: 's3', creator: 'Mina', handle: '@mina.codes', title: 'Tiny site, big energy', detail: 'A quick look at a landing page built between classes.', color: '#e9c754', time: '5h' },
  { id: 's4', creator: 'Ada', handle: '@ada.hustl', title: 'My workspace today', detail: 'Making room for the next good idea.', color: '#d7b5ed', time: '6h' },
];

const marketplace = [
  { title: 'Riso print bundle', type: 'Sell', price: '₹180', campus: 'Woxsen University', description: 'Six imperfectly perfect prints from the spring show.' },
  { title: 'Need a bass player tonight', type: 'Collab', price: 'Trade', campus: 'Woxsen University', description: 'Small set, good people, one open slot at The Substation.' },
  { title: 'Vintage desk lamp', type: 'Buy', price: '₹240', campus: 'Woxsen University', description: 'Warm orange glow. Works perfectly. Pickup near the quad.' },
];

const formatGig = (row: GigRow): Gig => ({
  id: row.id,
  ownerId: row.owner_id,
  title: row.title,
  description: row.description,
  poster: row.poster?.name ?? 'Campus student',
  campus: row.campus,
  budget: row.budget_min === row.budget_max ? `₹${row.budget_min.toLocaleString('en-IN')}` : `₹${row.budget_min.toLocaleString('en-IN')}–${row.budget_max.toLocaleString('en-IN')}`,
  deadline: row.deadline ? new Date(row.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Flexible',
  category: row.category,
  tags: row.tags ?? [],
  types: (row.work_types ?? []) as GigType[],
  applicants: row.application_count?.[0]?.count ?? 0,
  status: row.status === 'open' ? 'Open' : 'Closed',
});

const initials = (name: string) => name.split(' ').map((word) => word[0]).join('').slice(0, 2);

function AuthView({ onSuccess }: { onSuccess: (profile: StudentProfile) => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('India');
  const [university, setUniversity] = useState('Woxsen University');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!supabaseConfigured) { setError('HUSTL needs its Supabase project URL and publishable key.'); return; }
    const emailValue = email.trim().toLowerCase();
    setBusy(true);
    try {
      if (!awaitingCode) {
        if (mode === 'signup') {
          if (!name.trim() || !handle.trim() || !phone.trim() || !university.trim()) {
            setError('Complete your name, handle, phone number, and university first.'); return;
          }
          if (!/^@[a-z0-9_.]{3,30}$/i.test(handle.trim())) {
            setError('Your handle must start with @ and use 3–30 letters, numbers, dots, or underscores.'); return;
          }
        }
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: emailValue,
          options: {
            shouldCreateUser: mode === 'signup',
            ...(mode === 'signup' ? { data: { name: name.trim(), handle: handle.trim().toLowerCase(), phone: phone.trim(), location: location.trim(), university: university.trim() } } : {}),
          },
        });
        if (otpError) throw otpError;
        setAwaitingCode(true);
        return;
      }

      const { data, error: verifyError } = await supabase.auth.verifyOtp({ email: emailValue, token: code.trim(), type: 'email' });
      if (verifyError) throw verifyError;
      if (!data.user?.id || !data.user.email) throw new Error('Could not load the verified account. Please try again.');
      const { data: invitation, error: inviteError } = await supabase.from('beta_invites').select('email').eq('email', emailValue).maybeSingle();
      if (inviteError) throw inviteError;
      if (!invitation) {
        await supabase.auth.signOut();
        setAwaitingCode(false);
        setCode('');
        setError('HUSTL is invite-only for now. Ask the person who shared the app to invite this email address.');
        return;
      }
      const { data: existing, error: profileReadError } = await supabase.from('student_profiles').select('*').eq('user_id', data.user.id).maybeSingle();
      if (profileReadError) throw profileReadError;
      let profile = existing as unknown as StudentProfileRow | null;
      if (!profile && mode === 'signup') {
        const { data: created, error: profileCreateError } = await supabase.from('student_profiles').insert({
          user_id: data.user.id,
          name: name.trim(),
          handle: handle.trim().toLowerCase(),
          phone: phone.trim(),
          location: location.trim(),
          university: university.trim(),
          bio: '',
          skills: [],
        }).select('*').single();
        if (profileCreateError) throw profileCreateError;
        profile = created as unknown as StudentProfileRow;
      }
      if (!profile) throw new Error('No HUSTL profile found for this account. Choose Sign up to create one.');
      onSuccess({ name: profile.name, handle: profile.handle, phone: profile.phone, email: data.user.email, location: profile.location, university: profile.university, bio: profile.bio, skills: profile.skills ?? [] });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign-in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-spark auth-spark-one"><Sparkles size={26} /></div>
      <div className="auth-spark auth-spark-two"><Sparkles size={19} /></div>
      <section className="auth-card">
        <div className="auth-brand" aria-label="HUSTL"><span className="auth-brand-word">HUSTL</span><Sparkles size={22} /></div>
        <div className="auth-intro">
          <span className="eyebrow auth-eyebrow"><ShieldCheck size={14} /> Email verified, by design.</span>
          <h1>{mode === 'login' ? 'Make your next move.' : 'Join the campus in motion.'}</h1>
          <p>{mode === 'login' ? 'Sign in to find small gigs, share your work, and make your own luck.' : 'Create a profile with the email address that received your HUSTL invite.'}</p>
        </div>
        <div className="auth-switch" role="tablist" aria-label="Account access">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setAwaitingCode(false); setCode(''); setError(''); }} role="tab" aria-selected={mode === 'login'} data-testid="button-auth-login">Log in</button>
          <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setAwaitingCode(false); setCode(''); setError(''); }} role="tab" aria-selected={mode === 'signup'} data-testid="button-auth-signup">Sign up</button>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <label className="form-label">Email address<input className="form-control" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" data-testid="input-auth-email" required /></label>
          {mode === 'signup' && (
            <>
              <div className="auth-form-row">
                <label className="form-label">Name<input className="form-control" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" data-testid="input-auth-name" required /></label>
                <label className="form-label">Phone number<input className="form-control" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Your phone" inputMode="tel" data-testid="input-auth-phone" required /></label>
              </div>
              <div className="auth-form-row">
                <label className="form-label">Handle<input className="form-control" value={handle} onChange={(event) => setHandle(event.target.value)} placeholder="@yourname" maxLength={31} data-testid="input-auth-handle" required /></label>
                <label className="form-label">Location<input className="form-control" value={location} onChange={(event) => setLocation(event.target.value)} data-testid="input-auth-location" required /></label>
              </div>
              <label className="form-label">University name<input className="form-control" value={university} readOnly aria-readonly="true" data-testid="input-auth-university" required /></label>
            </>
          )}
          {awaitingCode && <label className="form-label">Email code<input className="form-control" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Enter the code sent to your email" inputMode="numeric" maxLength={8} data-testid="input-auth-code" required /></label>}
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="button button-primary auth-submit" type="submit" disabled={busy} data-testid="button-auth-submit">{busy ? 'Please wait…' : awaitingCode ? 'Verify code' : mode === 'login' ? 'Send sign-in code' : 'Send verification code'} <ArrowUpRight size={15} /></button>
          {awaitingCode && <button type="button" className="button button-ghost" onClick={() => { setAwaitingCode(false); setCode(''); setError(''); }}>Change email</button>}
        </form>
        <p className="auth-footer">HUSTL is invite-only for now. We’ll verify your invited email address with a one-time code.</p>
      </section>
    </main>
  );
}

function AppShell({ children, view, onNavigate, onPost, onLogout, userId }: { children: ReactNode; view: View; onNavigate: (view: View) => void; onPost: () => void; onLogout: () => void; userId: string }) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; detail: string; created_at: string; read_at: string | null }>>([]);
  const unreadCount = notifications.filter((item) => !item.read_at).length;
  const loadNotifications = async () => {
    if (!userId) return;
    const { data, error } = await supabase.from('notifications').select('id,title,detail,created_at,read_at').order('created_at', { ascending: false }).limit(30);
    if (!error) setNotifications((data ?? []) as typeof notifications);
  };
  useEffect(() => {
    void loadNotifications();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void loadNotifications(); }, 15000);
    return () => window.clearInterval(timer);
  }, [userId]);
  const markNotificationsRead = async () => {
    if (!userId || unreadCount === 0) return;
    const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', userId).is('read_at', null);
    if (!error) await loadNotifications();
  };
  const items: { key: View; label: string; icon: typeof Home }[] = [
    { key: 'home', label: 'Home feed', icon: Home },
    { key: 'explore', label: 'Explore', icon: Compass },
    { key: 'messages', label: 'Messages', icon: MessageCircle },
    { key: 'profile', label: 'My profile', icon: UserRound },
  ];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand-mark" onClick={() => onNavigate('home')} data-testid="button-brand-home">
          <span className="brand-word">HUSTL</span><span className="brand-spark"><Sparkles size={19} /></span>
        </button>
        <p className="nav-label">Your campus, in motion</p>
        <nav className="nav-stack" aria-label="Main navigation">
          {items.map(({ key, label, icon: Icon }) => (
            <button key={key} className={`nav-item ${view === key ? 'active' : ''}`} onClick={() => onNavigate(key)} data-testid={`button-nav-${key}`}>
              <Icon /> <span>{label}</span>
            </button>
          ))}
          <button className={`nav-item ${view === 'poster' ? 'active' : ''}`} onClick={() => onNavigate('poster')} data-testid="button-nav-poster">
            <LayoutDashboard /> <span>Poster dashboard</span>
          </button>
        </nav>
        <div className="sidebar-foot">
          <div className="sidebar-actions">
            <button className="button button-primary sidebar-post" onClick={onPost} data-testid="button-sidebar-post"><Plus size={16} /> Post a gig</button>
            <button className="notification-button" onClick={() => setNotificationsOpen((open) => !open)} aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} aria-expanded={notificationsOpen} data-testid="button-notifications">
              <Bell size={17} />{unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}
            </button>
            {notificationsOpen && <div className="notification-popover" role="dialog" aria-label="Notifications">
              <div className="notification-heading"><div><strong>Notifications</strong><span>{unreadCount} new</span></div><button onClick={() => void markNotificationsRead()} data-testid="button-read-notifications">Mark all read</button></div>
              {notifications.map((item) => <article className={`notification-item ${item.read_at ? 'read' : ''}`} key={item.id}><span className="notification-dot" /><div><strong>{item.title}</strong><p>{item.detail}</p><small>{new Date(item.created_at).toLocaleString()}</small></div></article>)}
              {notifications.length === 0 && <p className="message-empty">Notifications will appear here when someone responds to your activity.</p>}
            </div>}
          </div>
          <div className="help-line"><span>Services & help</span><a href="mailto:hustl@gmail.com"><Mail size={12} /> hustl@gmail.com</a></div>
          <button className="logout-button" onClick={onLogout} data-testid="button-logout"><LogOut size={14} /> Log out</button>
        </div>
      </aside>
      <main className="main-column">
        <header className="topbar">
          <div className="crumb"><span>India /</span> <strong>{view === 'home' ? 'The feed' : view === 'poster' ? 'Poster dashboard' : view[0].toUpperCase() + view.slice(1)}</strong></div>
          <div className="top-actions">
            <button className="icon-button" onClick={() => onNavigate('messages')} aria-label="Open messages" data-testid="button-top-messages"><MessageCircle size={17} /></button>
            <button className="icon-button top-notification-button" onClick={() => setNotificationsOpen((open) => !open)} aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} aria-expanded={notificationsOpen} data-testid="button-top-notifications"><Bell size={16} />{unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}</button>
            <button className="icon-button mobile-logout" onClick={onLogout} aria-label="Log out" data-testid="button-mobile-logout"><LogOut size={15} /></button>
            <button className="avatar" onClick={() => onNavigate('profile')} aria-label="Open profile" data-testid="button-top-profile">AS</button>
          </div>
        </header>
        {notificationsOpen && <div className="mobile-notification-layer"><div className="notification-popover" role="dialog" aria-label="Notifications">
          <div className="notification-heading"><div><strong>Notifications</strong><span>{unreadCount} new</span></div><button onClick={() => void markNotificationsRead()} data-testid="button-top-read-notifications">Mark all read</button></div>
          {notifications.map((item) => <article className={`notification-item ${item.read_at ? 'read' : ''}`} key={item.id}><span className="notification-dot" /><div><strong>{item.title}</strong><p>{item.detail}</p><small>{new Date(item.created_at).toLocaleString()}</small></div></article>)}
          {notifications.length === 0 && <p className="message-empty">Notifications will appear here when someone responds to your activity.</p>}
        </div></div>}
        {children}
      </main>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {items.slice(0, 4).map(({ key, label, icon: Icon }) => <button key={key} className={view === key ? 'active' : ''} onClick={() => onNavigate(key)} data-testid={`button-mobile-${key}`}><Icon /><span>{label.split(' ')[0]}</span></button>)}
        <button className={view === 'poster' ? 'active' : ''} onClick={() => onNavigate('poster')} data-testid="button-mobile-poster"><LayoutDashboard /><span>Post</span></button>
      </nav>
    </div>
  );
}

function GigCard({ gig, saved, onSave, onPitch }: { gig: Gig; saved: boolean; onSave: () => void; onPitch: () => void }) {
  return (
    <article className="gig-card" data-testid={`card-gig-${gig.id}`}>
      <div className="gig-top"><span className="category-stamp">{gig.category}</span><button className={`save-button ${saved ? 'saved' : ''}`} onClick={onSave} aria-label={saved ? 'Remove saved gig' : 'Save gig'} data-testid={`button-save-${gig.id}`}><Bookmark size={18} fill={saved ? 'currentColor' : 'none'} /></button></div>
      <h3 className="gig-title">{gig.title}</h3>
      <p className="gig-desc">{gig.description}</p>
      <div className="gig-type-row">{gig.types.map((type) => <span className="gig-type-chip" key={type}>{type}</span>)}</div>
      <div className="tag-row">{gig.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
      <div className="gig-footer">
        <div className="gig-meta"><span className="gig-budget">{gig.budget}</span><span><Clock3 size={11} style={{ verticalAlign: '-2px', marginRight: 3 }} /> due {gig.deadline}</span><span>{gig.applicants} pitches · {gig.campus}</span></div>
        <button className="card-cta" onClick={onPitch} data-testid={`button-pitch-${gig.id}`}>Pitch <ArrowUpRight size={13} /></button>
      </div>
    </article>
  );
}

function StoriesBar({ onOpenStory }: { onOpenStory: (id: string) => void }) {
  return <section className="stories-bar" aria-label="Campus stories">
    <div className="stories-title"><span>Stories</span><small>sample preview content</small></div>
    <div className="story-list">
      {stories.map((story) => <button className="story-button" key={story.id} onClick={() => onOpenStory(story.id)} data-testid={`button-story-${story.id}`}>
        <span className="story-ring" style={{ background: `linear-gradient(135deg, #ffcf52, #ef4c91 52%, ${story.color})` }}><span style={{ background: story.color }}>{initials(story.creator)}</span></span>
        <span className="story-creator">{story.creator}</span>
      </button>)}
    </div>
  </section>;
}

function StoryViewer({ story, index, onClose, onPrevious, onNext }: { story: typeof stories[number]; index: number; onClose: () => void; onPrevious: () => void; onNext: () => void }) {
  return <div className="story-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
    <article className="story-viewer" style={{ background: `linear-gradient(155deg, ${story.color}, #201657 92%)` }} data-testid="story-viewer">
      <div className="story-progress">{stories.map((item, itemIndex) => <span key={item.id} className={itemIndex <= index ? 'filled' : ''} />)}</div>
      <header className="story-viewer-head"><div className="story-avatar" style={{ background: story.color }}>{initials(story.creator)}</div><div><strong>{story.creator}</strong><span>{story.handle} · {story.time}</span></div><button className="story-close" onClick={onClose} aria-label="Close story" data-testid="button-close-story"><X size={20} /></button></header>
      <div className="story-content"><Sparkles size={28} /><h2>{story.title}</h2><p>{story.detail}</p><span className="story-sticker">made between classes</span></div>
      <button className="story-hit story-hit-prev" aria-label="Previous story" onClick={onPrevious} data-testid="button-story-previous" />
      <button className="story-hit story-hit-next" aria-label="Next story" onClick={onNext} data-testid="button-story-next" />
      <footer className="story-viewer-footer"><span>Campus story</span><span>{index + 1} / {stories.length}</span></footer>
    </article>
  </div>;
}

function HomeView({ gigs, onPost, onPitch, onOpenStory, saved, toggleSaved, onCreator, mode, setMode, category, setCategory }: { gigs: Gig[]; onPost: () => void; onPitch: (id: string) => void; onOpenStory: (id: string) => void; saved: string[]; toggleSaved: (id: string) => void; onCreator: (handle: string) => void; mode: 'gigs' | 'reels'; setMode: (mode: 'gigs' | 'reels') => void; category: string; setCategory: (category: string) => void }) {
  const categories = ['All', 'Design', 'Video', 'Writing', 'Code', 'Photo', 'Music', 'Marketing'];
  const filtered = gigs.filter((gig) => category === 'All' || gig.category === category);
  return (
    <div className="page-wrap">
      <StoriesBar onOpenStory={onOpenStory} />
      <section className="hero-grid">
        <div className="hero-copy">
          <div className="eyebrow"><Sparkles size={14} /> Small gigs. Real momentum.</div>
          <h1 className="hero-title">MAKE YOUR<br /><em>OWN</em> LUCK.</h1>
          <p className="hero-sub">A campus marketplace for the skill you have, the hour you found, and the idea you are not done with yet.</p>
          <div className="hero-actions"><button className="button button-primary" onClick={onPost} data-testid="button-hero-post">Post a gig <Plus size={15} /></button><button className="button button-ghost" onClick={() => document.getElementById('gig-market')?.scrollIntoView({ behavior: 'smooth' })} data-testid="button-hero-browse">Find your next thing <ChevronRight size={15} /></button></div>
        </div>
        <aside className="hero-note"><Sparkles size={24} color="#ef4c91" /><h3>Open between<br />classes.</h3><p>Good campus work starts with one clear ask and the right person finding it.</p><div className="note-line"><span>email verified</span><span>01 / 04</span></div></aside>
      </section>
      <section id="gig-market">
        <div className="section-head"><div><h2 className="section-title">What are you in the mood to make?</h2><p className="section-kicker">Fresh from students around your campus.</p></div><div className="mode-switch"><button className={mode === 'gigs' ? 'active' : ''} onClick={() => setMode('gigs')} data-testid="button-mode-gigs"><BriefcaseBusiness size={13} style={{ verticalAlign: '-2px', marginRight: 5 }} /> Gig marketplace</button><button className={mode === 'reels' ? 'active' : ''} onClick={() => setMode('reels')} data-testid="button-mode-reels"><Play size={13} style={{ verticalAlign: '-2px', marginRight: 5 }} /> Reels preview</button></div></div>
        {mode === 'gigs' ? <><div className="filter-row" style={{ marginBottom: 17 }}>{categories.map((item) => <button key={item} className={`filter ${category === item ? 'active' : ''}`} onClick={() => setCategory(item)} data-testid={`button-filter-${item.toLowerCase()}`}>{item}</button>)}</div>{filtered.length ? <div className="gigs-grid">{filtered.map((gig, index) => <div key={gig.id} style={{ animationDelay: `${index * 45}ms` }}><GigCard gig={gig} saved={saved.includes(gig.id)} onSave={() => toggleSaved(gig.id)} onPitch={() => onPitch(gig.id)} /></div>)}</div> : <div className="empty-state"><BriefcaseBusiness size={26} /><h3>No gigs are live yet.</h3><p>Post the first campus gig and give someone a good reason to make something.</p><button className="button button-primary" onClick={onPost}>Post a gig <Plus size={15} /></button></div>}</> : <div className="reels-grid">{reels.map((reel, index) => <article className="reel-card" key={reel.title} style={{ background: reel.accentColor, animation: `rise .45s ${index * 60}ms ease both` }} data-testid={`card-reel-${index}`}><button className="reel-play" aria-label={`Play ${reel.title}`} data-testid={`button-play-reel-${index}`}><Play size={14} fill="currentColor" /></button><div><div className="reel-title">{reel.title}</div><div className="reel-bottom"><span><strong>{reel.creator}</strong>{reel.category}</span><span>{reel.stat}</span></div></div></article>)}</div>}
      </section>
      <div className="bottom-layout">
        <section className="panel"><div className="panel-head"><div><h3>Creator examples</h3><p className="panel-sub">Sample profiles; member showcases are not live yet.</p></div><button className="mini-button" onClick={() => setMode('reels')} data-testid="button-see-creators">Reels preview <ArrowUpRight size={12} /></button></div><div className="creator-list">{creators.map((creator) => <div className="creator-row" key={creator.handle}><div className="creator-info"><div className="creator-avatar" style={{ background: creator.avatarColor }}>{initials(creator.name)}</div><div><div className="creator-name">{creator.name}</div><div className="creator-handle">{creator.handle} · {creator.campus}</div></div></div><div className="creator-rating"><Star size={12} fill="currentColor" style={{ verticalAlign: '-2px' }} /> {creator.rating}</div><button className="mini-button" onClick={() => onCreator(creator.handle)} data-testid={`button-view-creator-${creator.handle.slice(1)}`}>Preview</button></div>)}</div></section>
        <section className="panel"><div className="panel-head"><div><h3>Campus exchange examples</h3><p className="panel-sub">Sample listings only; buying and selling are not live yet.</p></div><Store size={20} color="#f0c85b" /></div><div className="market-list">{marketplace.map((item) => <div className="market-item" key={item.title}><div><h4>{item.title}</h4><p>{item.description}</p><p style={{ marginTop: 7 }}>{item.type} · {item.campus}</p></div><span className="market-price">{item.price}</span></div>)}</div></section>
      </div>
    </div>
  );
}

type ExploreFilters = { minPrice: number; maxPrice: number; types: GigType[]; domains: string[] };
const exploreTypeOptions: GigType[] = ['Online', 'Offline', 'Trade', 'Collaborate'];
const exploreDomainOptions = ['Video', 'Photography', 'Design', 'Tech', 'Marketing', 'Writing', 'Music'];
const defaultExploreFilters = (): ExploreFilters => ({ minPrice: 50, maxPrice: 1200, types: [], domains: [] });
const getGigDomain = (category: string) => ({ Photo: 'Photography', Code: 'Tech' }[category] ?? category);
const getGigPriceRange = (budget: string): [number, number] | null => {
  const amounts = budget.match(/\d[\d,]*/g)?.map((amount) => Number(amount.replaceAll(',', ''))) ?? [];
  if (!amounts.length) return null;
  return [Math.min(...amounts), Math.max(...amounts)];
};
const matchesExploreFilters = (gig: Gig, filters: ExploreFilters) => {
  const priceRange = getGigPriceRange(gig.budget);
  const priceMatches = priceRange
    ? priceRange[1] >= filters.minPrice && priceRange[0] <= filters.maxPrice
    : filters.minPrice === 50 && filters.maxPrice === 1200;
  const typeMatches = filters.types.length === 0 || filters.types.some((type) => gig.types.includes(type));
  const domainMatches = filters.domains.length === 0 || filters.domains.includes(getGigDomain(gig.category));
  return priceMatches && typeMatches && domainMatches;
};

function ExploreView({ gigs, onPitch, saved, toggleSaved }: { gigs: Gig[]; onPitch: (id: string) => void; saved: string[]; toggleSaved: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<ExploreFilters>(defaultExploreFilters);
  const [draftFilters, setDraftFilters] = useState<ExploreFilters>(defaultExploreFilters);
  const searchMatches = (gig: Gig, search: string) => `${gig.title} ${gig.description} ${gig.category} ${getGigDomain(gig.category)} ${gig.types.join(' ')} ${gig.tags.join(' ')}`.toLowerCase().includes(search.trim().toLowerCase());
  const results = gigs.filter((gig) => searchMatches(gig, query) && matchesExploreFilters(gig, filters));
  const draftResultCount = gigs.filter((gig) => searchMatches(gig, query) && matchesExploreFilters(gig, draftFilters)).length;
  const activeFilterCount = filters.types.length + filters.domains.length + Number(filters.minPrice > 50) + Number(filters.maxPrice < 1200);
  const toggleType = (type: GigType) => setDraftFilters((current) => ({ ...current, types: current.types.includes(type) ? current.types.filter((item) => item !== type) : [...current.types, type] }));
  const toggleDomain = (domain: string) => setDraftFilters((current) => ({ ...current, domains: current.domains.includes(domain) ? current.domains.filter((item) => item !== domain) : [...current.domains, domain] }));
  const resetAll = () => {
    setQuery('');
    const defaults = defaultExploreFilters();
    setFilters(defaults);
    setDraftFilters(defaults);
    setFiltersOpen(false);
  };
  const openFilters = () => {
    setDraftFilters({ ...filters, types: [...filters.types], domains: [...filters.domains] });
    setFiltersOpen(true);
  };

  return <div className="page-wrap">
    <div className="eyebrow"><Compass size={14} /> The whole campus is a lead</div>
    <h1 className="section-title" style={{ fontSize: 42, marginBottom: 9 }}>Explore the workboard.</h1>
    <p className="section-kicker" style={{ marginBottom: 27 }}>Search the things students are making room for right now.</p>
    <div className="search-row explore-search-row">
      <div className="search-wrap"><Search /><input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try “video”, “Figma”, or “something quick”" data-testid="input-explore-search" /></div>
      <div className="explore-filter-wrap">
        <button className="explore-filter-trigger" onClick={filtersOpen ? () => setFiltersOpen(false) : openFilters} aria-expanded={filtersOpen} aria-haspopup="dialog" data-testid="button-explore-filters"><SlidersHorizontal size={16} /> Filters{activeFilterCount > 0 && <span className="explore-filter-badge">{activeFilterCount}</span>}</button>
        {filtersOpen && <>
          <button className="filter-dismiss-layer" aria-label="Close filters" onClick={() => setFiltersOpen(false)} tabIndex={-1} />
          <section className="explore-filter-popover" role="dialog" aria-label="Filter gigs" data-testid="explore-filter-popover">
            <header className="explore-filter-header"><div><h2>Filter gigs</h2><span>{draftResultCount} matching {draftResultCount === 1 ? 'gig' : 'gigs'}</span></div><button onClick={() => setFiltersOpen(false)} aria-label="Close filters"><X size={18} /></button></header>
            <section className="explore-filter-section">
              <div className="explore-filter-section-title"><strong>Price range</strong><span>₹50–₹1,200</span></div>
              <div className="explore-price-fields">
                <label>Minimum<input type="number" min="50" max="1200" step="1" value={draftFilters.minPrice} onChange={(event) => { const value = Math.min(1200, Math.max(50, Number(event.target.value) || 50)); setDraftFilters((current) => ({ ...current, minPrice: value, maxPrice: Math.max(current.maxPrice, value) })); }} aria-label="Minimum price" data-testid="input-filter-min-price" /></label>
                <span className="explore-price-separator">to</span>
                <label>Maximum<input type="number" min="50" max="1200" step="1" value={draftFilters.maxPrice} onChange={(event) => { const value = Math.max(50, Math.min(1200, Number(event.target.value) || 1200)); setDraftFilters((current) => ({ ...current, minPrice: Math.min(current.minPrice, value), maxPrice: value })); }} aria-label="Maximum price" data-testid="input-filter-max-price" /></label>
              </div>
            </section>
            <section className="explore-filter-section">
              <div className="explore-filter-section-title"><strong>Type of gig</strong><span>Select any</span></div>
              <div className="explore-filter-options">{exploreTypeOptions.map((type) => <label className={`explore-filter-option ${draftFilters.types.includes(type) ? 'selected' : ''}`} key={type}><input type="checkbox" checked={draftFilters.types.includes(type)} onChange={() => toggleType(type)} data-testid={`checkbox-filter-type-${type.toLowerCase()}`} /><span>{type}</span></label>)}</div>
            </section>
            <section className="explore-filter-section">
              <div className="explore-filter-section-title"><strong>Domain</strong><span>Select any</span></div>
              <div className="explore-filter-options">{exploreDomainOptions.map((domain) => <label className={`explore-filter-option ${draftFilters.domains.includes(domain) ? 'selected' : ''}`} key={domain}><input type="checkbox" checked={draftFilters.domains.includes(domain)} onChange={() => toggleDomain(domain)} data-testid={`checkbox-filter-domain-${domain.toLowerCase()}`} /><span>{domain}</span></label>)}</div>
            </section>
            <footer className="explore-filter-footer"><button className="filter-reset-button" onClick={() => setDraftFilters(defaultExploreFilters())} data-testid="button-reset-explore-filters">Reset</button><button className="button button-primary" onClick={() => { setFilters({ ...draftFilters, types: [...draftFilters.types], domains: [...draftFilters.domains] }); setFiltersOpen(false); }} data-testid="button-apply-explore-filters">Show {draftResultCount} {draftResultCount === 1 ? 'gig' : 'gigs'}</button></footer>
          </section>
        </>}
      </div>
      <button className="button button-secondary clear-explore-search" onClick={() => setQuery('')} data-testid="button-clear-explore">Clear search</button>
    </div>
    <div className="explore-results-heading"><span>{results.length} {results.length === 1 ? 'gig' : 'gigs'}</span>{activeFilterCount > 0 && <button onClick={resetAll} data-testid="button-clear-explore-filters">Clear filters</button>}</div>
    {results.length ? <div className="gigs-grid">{results.map((gig) => <GigCard key={gig.id} gig={gig} saved={saved.includes(gig.id)} onSave={() => toggleSaved(gig.id)} onPitch={() => onPitch(gig.id)} />)}</div> : <div className="empty-state"><Search size={26} /><h3>No match yet.</h3><p>Try a broader search or clear the filters to see every gig.</p><button className="button button-primary" onClick={resetAll} data-testid="button-empty-reset">Show all gigs</button></div>}
  </div>;
}

const profilePosts = [
  { title: 'Poster study 01', kind: 'Reel', color: '#ef4c91' },
  { title: 'Campus light', kind: 'Photo', color: '#80d1c1' },
  { title: 'The brief behind the brief', kind: 'Reel', color: '#e9c754' },
  { title: 'Riso experiments', kind: 'Photo', color: '#d7b5ed' },
  { title: 'Between classes', kind: 'Reel', color: '#e9b8c4' },
  { title: 'Woxsen after rain', kind: 'Photo', color: '#83b9de' },
];

const profileActivity = [
];

function ProfileView({ profile, gigs, saved, toggleSaved, onPitch, onCreator }: {
  profile: StudentProfile;
  gigs: Gig[];
  saved: string[];
  toggleSaved: (id: string) => void;
  onPitch: (id: string) => void;
  onCreator: (handle: string) => void;
}) {
  const [activityFilter, setActivityFilter] = useState<ProfileActivityFilter>('all');
  const [section, setSection] = useState<ProfileSection>('grid');
  const touchStartX = useRef<number | null>(null);
  const filteredActivity = profileActivity.filter((item) => activityFilter === 'all' || item.side === activityFilter);
  const savedGigs = gigs.filter((gig) => saved.includes(gig.id));
  const sections: { key: ProfileSection; label: string; icon: typeof Grid2X2 }[] = [
    { key: 'grid', label: 'Reels and photos', icon: Grid2X2 },
    { key: 'activity', label: 'Posted, selling, applied and buying', icon: BriefcaseBusiness },
    { key: 'skills', label: 'Skills', icon: Sparkles },
    { key: 'saved', label: 'Saved gigs', icon: Bookmark },
    { key: 'worked', label: 'Collaborators', icon: UsersRound },
  ];
  const sectionIndex = sections.findIndex((item) => item.key === section);
  const moveSection = (direction: number) => {
    const nextIndex = Math.max(0, Math.min(sections.length - 1, sectionIndex + direction));
    setSection(sections[nextIndex].key);
  };
  return (
    <div className="page-wrap">
      <div className="profile-hero">
        <div className="profile-big-avatar" style={{ background: '#ef4c91' }}>{initials(profile.name)}</div>
        <div>
          <h1>{profile.name}</h1>
          <p className="profile-handle">{profile.handle}</p>
          <p className="profile-university">{profile.university}</p>
          <p className="profile-bio">{profile.bio}</p>
        </div>
      </div>
      <nav className="profile-icon-nav" aria-label="Profile sections">
        {sections.map(({ key, label, icon: Icon }) => <button key={key} className={section === key ? 'active' : ''} onClick={() => setSection(key)} aria-label={label} aria-current={section === key ? 'page' : undefined} title={label} data-testid={`button-profile-section-${key}`}><Icon size={18} /></button>)}
      </nav>
      <section className="profile-content" aria-label={sections[sectionIndex].label}
        onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; }}
        onTouchEnd={(event) => {
          if (touchStartX.current === null) return;
          const delta = event.changedTouches[0].clientX - touchStartX.current;
          if (Math.abs(delta) > 55) moveSection(delta < 0 ? 1 : -1);
          touchStartX.current = null;
        }}>
        {section === 'grid' && <section className="profile-section"><div className="profile-content-heading"><h2 className="section-title">Reels & photos</h2><p className="section-kicker">Sample tiles only; uploading posts is not live yet.</p></div><div className="profile-grid">{profilePosts.map((post, index) => <button className="profile-post" key={post.title} style={{ background: post.color }} data-testid={`button-profile-post-${index}`}><span className="profile-post-mark">{post.kind === 'Reel' ? <Play size={16} fill="currentColor" /> : <span className="profile-photo-mark" />}</span><span className="profile-post-label">{post.title}</span><span className="profile-post-type">{post.kind}</span></button>)}</div></section>}
        {section === 'activity' && <section className="profile-section"><div className="profile-content-heading"><h2 className="section-title">Your activity</h2><p className="section-kicker">Your current activity feed is still being connected.</p></div><div className="empty-state"><BriefcaseBusiness size={26} /><h3>No activity to show here yet.</h3><p>Use your poster dashboard to manage gigs and pitches.</p></div></section>}
        {section === 'skills' && <section className="profile-section"><div className="profile-content-heading"><h2 className="section-title">Skills</h2><p className="section-kicker">Things Ada can bring to a project.</p></div><div className="profile-skills">{profile.skills.map((skill, index) => <span className={`profile-skill profile-skill-${index % 4}`} key={skill}><Sparkles size={13} />{skill}</span>)}</div></section>}
        {section === 'saved' && <section className="profile-section"><div className="profile-content-heading"><h2 className="section-title">Saved gigs</h2><p className="section-kicker">Your bookmarked campus opportunities.</p></div>{savedGigs.length ? <div className="gigs-grid">{savedGigs.map((gig) => <GigCard key={gig.id} gig={gig} saved onSave={() => toggleSaved(gig.id)} onPitch={() => onPitch(gig.id)} />)}</div> : <div className="empty-state"><Bookmark size={27} /><h3>No saved gigs yet.</h3><p>Tap a bookmark on a gig to keep it here.</p></div>}</section>}
        {section === 'worked' && <section className="profile-section"><div className="profile-content-heading"><h2 className="section-title">Collaborators</h2><p className="section-kicker">Sample profiles only; collaboration history is not live yet.</p></div><div className="creator-list profile-collaborators">{creators.map((creator) => <article className="creator-row" key={creator.handle}><div className="creator-info"><div className="creator-avatar" style={{ background: creator.avatarColor }}>{initials(creator.name)}</div><div><div className="creator-name">{creator.name}</div><div className="creator-handle">{creator.handle} · {creator.campus}</div></div></div><div className="creator-rating"><Star size={12} fill="currentColor" /> {creator.rating}</div><button className="mini-button" onClick={() => onCreator(creator.handle)} data-testid={`button-profile-collaborator-${creator.handle.slice(1)}`}>Preview</button></article>)}</div></section>}
      </section>
    </div>
  );
}

type ThreadMessage = { from: string; time: string; text: string };
type ConversationThread = { id: string; name: string; time: string; color: string; messages: ThreadMessage[] };
const chatProfiles: Record<string, { handle: string; university: string; bio: string }> = {
  riley: { handle: '@rileyframes', university: 'Woxsen University', bio: 'Short-form video maker, motion designer, and campus storyteller.' },
  theo: { handle: '@theobuilds', university: 'Woxsen University', bio: 'Building clean, playful websites for student events and new ideas.' },
  jules: { handle: '@julescreates', university: 'Woxsen University', bio: 'Coffee-shop cinematography, quick edits, and good stories.' },
  maya: { handle: '@mayamakes', university: 'Woxsen University', bio: 'Design student turning research, notes, and big questions into zines.' },
  ari: { handle: '@ariarchives', university: 'Woxsen University', bio: 'Vintage finds, thoughtful names, and second-life fashion.' },
  priya: { handle: '@priyaplays', university: 'Woxsen University', bio: 'Making soundtracks for campus runs, late nights, and everything between.' },
  milo: { handle: '@milograntphoto', university: 'Woxsen University', bio: 'Campus photographer chasing natural light and warm portraits.' },
  noah: { handle: '@noahmakes', university: 'Woxsen University', bio: 'Illustrator and visual designer with a soft spot for print.' },
  mina: { handle: '@mina.codes', university: 'Woxsen University', bio: 'Frontend tinkerer making small, useful things for the student community.' },
};

function MessagesView() {
  const seedConversations: ConversationThread[] = [
    { id: 'riley', name: 'Riley Martinez', time: '12m', color: '#ed7da6', messages: [{ from: 'Riley', time: '10:42 AM', text: 'I can send over a first cut tonight. Does 7pm work?' }, { from: 'You', time: '10:46 AM', text: 'That works. I’ll leave notes on the draft before class.' }, { from: 'Riley', time: '10:51 AM', text: 'Perfect — I’ll share it here as soon as it’s ready.' }] },
    { id: 'theo', name: 'Theo Brooks', time: '1h', color: '#80d1c1', messages: [{ from: 'Theo', time: 'Yesterday', text: 'That landing page brief is exactly my kind of weird.' }, { from: 'You', time: 'Yesterday', text: 'Love that. The gallery wants it live by Friday.' }, { from: 'Theo', time: 'Today', text: 'I’ll send a first layout after my afternoon lecture.' }] },
    { id: 'jules', name: 'Jules Ortega', time: 'Yesterday', color: '#e9c754', messages: [{ from: 'Jules', time: 'Yesterday', text: 'Your pitch made me laugh. Let’s talk details.' }, { from: 'You', time: 'Yesterday', text: 'Happy to! I can shoot on Thursday after 4.' }] },
    { id: 'maya', name: 'Maya Chen', time: 'Mon', color: '#d7b5ed', messages: [{ from: 'Maya', time: 'Monday', text: 'Could you help turn these field notes into a zine?' }, { from: 'You', time: 'Monday', text: 'Yes — send over the notes and the print size.' }] },
    { id: 'ari', name: 'Ari Wallace', time: 'Sun', color: '#f0c85b', messages: [{ from: 'Ari', time: 'Sunday', text: 'I’m looking for a naming partner for the next drop.' }, { from: 'You', time: 'Sunday', text: 'I have a few ideas already. Let’s compare lists.' }] },
    { id: 'priya', name: 'Priya Shah', time: 'Sep 24', color: '#ef8c65', messages: [{ from: 'Priya', time: 'Sep 24', text: 'Playlist is up! Added a warm-up and a victory lap.' }, { from: 'You', time: 'Sep 24', text: 'The victory lap track is perfect.' }] },
    { id: 'milo', name: 'Milo Grant', time: 'Sep 22', color: '#83b9de', messages: [{ from: 'Milo', time: 'Sep 22', text: 'Natural light should be great by the library steps.' }, { from: 'You', time: 'Sep 22', text: 'See you there at 3.' }] },
    { id: 'noah', name: 'Noah Williams', time: 'Sep 20', color: '#80d1c1', messages: [{ from: 'Noah', time: 'Sep 20', text: 'I’ve got the final poster exports ready.' }, { from: 'You', time: 'Sep 20', text: 'Thanks! The print table loved the colors.' }] },
    { id: 'mina', name: 'Mina Park', time: 'Sep 18', color: '#e9c754', messages: [{ from: 'Mina', time: 'Sep 18', text: 'The mobile prototype is ready for a quick look.' }, { from: 'You', time: 'Sep 18', text: 'Just checked it — the flow feels great.' }] },
  ];
  const [threads, setThreads] = useState<ConversationThread[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('hustl-chat-messages') ?? '{}') as Record<string, unknown>;
      return seedConversations.map((thread) => {
        const messages = stored[thread.id];
        const validMessages = Array.isArray(messages)
          ? messages.filter((message): message is ThreadMessage => {
            if (!message || typeof message !== 'object') return false;
            const candidate = message as Partial<ThreadMessage>;
            return typeof candidate.from === 'string' && typeof candidate.time === 'string' && typeof candidate.text === 'string';
          })
          : thread.messages;
        return { ...thread, messages: validMessages.length ? validMessages : thread.messages };
      });
    } catch {
      return seedConversations;
    }
  });
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('riley');
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [callMode, setCallMode] = useState<'voice' | 'video' | null>(null);
  const [storageNotice, setStorageNotice] = useState('');
  const filtered = threads.filter((conversation) => conversation.name.toLowerCase().includes(query.toLowerCase()) || conversation.messages.some((message) => message.text.toLowerCase().includes(query.toLowerCase())));
  const selected = threads.find((conversation) => conversation.id === selectedId);
  const sendMessage = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !selected) return;
    const sentAt = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const updatedThreads = threads.map((thread) => thread.id === selected.id
      ? { ...thread, time: 'Now', messages: [...thread.messages, { from: 'You', time: sentAt, text }] }
      : thread);
    setThreads(updatedThreads);
    setDraft('');
    try {
      localStorage.setItem('hustl-chat-messages', JSON.stringify(Object.fromEntries(updatedThreads.map((thread) => [thread.id, thread.messages]))));
      setStorageNotice('');
    } catch {
      setStorageNotice('Message sent, but this device could not save the chat history.');
    }
  };
  return <div className="page-wrap">
    <div className="eyebrow"><MessageCircle size={14} /> Keep the momentum moving</div>
    <h1 className="section-title" style={{ fontSize: 42, marginBottom: 7 }}>Messages.</h1>
    <p className="section-kicker" style={{ marginBottom: 25 }}>Your campus conversations, all in one place.</p>
    <div className={`messages-layout ${mobileChatOpen ? 'conversation-open' : ''}`}>
      <section className="inbox-panel" aria-label="All conversations">
        <div className="inbox-heading"><h2>All chats <span>{threads.length}</span></h2></div>
        <div className="search-wrap message-search"><Search /><input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search chats" aria-label="Search chats" data-testid="input-message-search" /></div>
        <div className="message-list">{filtered.map((conversation) => {
          const lastMessage = conversation.messages[conversation.messages.length - 1];
          return <button className={`message-card ${selectedId === conversation.id ? 'selected' : ''}`} key={conversation.id} onClick={() => { setSelectedId(conversation.id); setMobileChatOpen(true); setProfileOpen(false); }} data-testid={`button-message-${conversation.id}`}>
            <div className="creator-avatar" style={{ background: conversation.color }}>{initials(conversation.name)}</div><div className="message-summary"><strong>{conversation.name}</strong><p>{lastMessage.text}</p></div><span className="message-time">{conversation.time}</span>
          </button>;
        })}{filtered.length === 0 && <div className="message-empty">No chats match that search.</div>}</div>
      </section>
      <section className="conversation-panel" aria-label={selected ? `Chat with ${selected.name}` : 'Conversation'}>
        {selected ? <>
          <header className="conversation-heading">
            <button className="back-to-inbox" onClick={() => { setMobileChatOpen(false); setProfileOpen(false); }} aria-label="Back to chats" title="Back to chats" data-testid="button-back-to-chats"><ArrowLeft size={19} /></button>
            <div className="creator-avatar" style={{ background: selected.color }}>{initials(selected.name)}</div>
            <div className="conversation-person"><button className="conversation-name-button" onClick={() => setProfileOpen((open) => !open)} aria-haspopup="dialog" aria-expanded={profileOpen} aria-label={`View ${selected.name}'s profile`} data-testid="button-chat-profile">{selected.name}</button><span>HUSTL campus member</span></div>
            <div className="conversation-actions"><button className="call-action" onClick={() => setCallMode('voice')} aria-label={`Voice call ${selected.name}`} title="Voice call" data-testid="button-voice-call"><Phone size={17} /></button><button className="call-action" onClick={() => setCallMode('video')} aria-label={`Video call ${selected.name}`} title="Video call" data-testid="button-video-call"><Video size={17} /></button></div>
          </header>
          {profileOpen && <section className="chat-profile-popover" role="dialog" aria-label={`${selected.name}'s profile`} data-testid="chat-profile-popover">
            <button className="chat-profile-close" onClick={() => setProfileOpen(false)} aria-label="Close profile"><X size={16} /></button>
            <div className="chat-profile-avatar" style={{ background: selected.color }}>{initials(selected.name)}</div>
            <h2>{selected.name}</h2>
            <span className="chat-profile-handle">{chatProfiles[selected.id]?.handle ?? '@campuscreator'}</span>
            <p className="chat-profile-university">{chatProfiles[selected.id]?.university ?? 'Woxsen University'}</p>
            <p className="chat-profile-bio">{chatProfiles[selected.id]?.bio ?? 'Making good things with the people around campus.'}</p>
          </section>}
          <div className="conversation-history">{selected.messages.map((message, index) => <article className={`chat-bubble ${message.from === 'You' ? 'mine' : ''}`} key={`${selected.id}-${index}`}><p>{message.text}</p><span>{message.from} · {message.time}</span></article>)}</div>
          <form className="message-composer" onSubmit={sendMessage}>
            <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={`Message ${selected.name.split(' ')[0]}…`} aria-label={`Message ${selected.name}`} data-testid="input-chat-message" />
            <button type="submit" className="send-message-button" disabled={!draft.trim()} aria-label="Send message" data-testid="button-send-message"><Send size={16} /></button>
          </form>
          {storageNotice && <p className="chat-storage-notice" role="status">{storageNotice}</p>}
          <div className="conversation-foot"><span>Chat history is saved on this device.</span><button className="mini-button" onClick={() => { setSelectedId(''); setMobileChatOpen(false); setProfileOpen(false); }} data-testid="button-close-conversation">Close chat</button></div>
        </> : <div className="empty-state conversation-empty"><MessageCircle size={26} /><h3>Select a chat</h3><p>Choose any conversation to view its message history.</p></div>}
      </section>
    </div>
    {callMode && selected && <div className="call-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setCallMode(null); }}>
      <section className={`call-card ${callMode}`} role="dialog" aria-modal="true" aria-label={`${callMode === 'voice' ? 'Voice' : 'Video'} call with ${selected.name}`} data-testid="call-preview">
        <button className="call-close" onClick={() => setCallMode(null)} aria-label="Close call preview"><X size={18} /></button>
        <div className="call-avatar" style={{ background: selected.color }}>{initials(selected.name)}</div>
        <h2>{selected.name}</h2>
        <p>{callMode === 'voice' ? 'Voice call' : 'Video call'} preview</p>
        <span className="call-preview-note">Call controls are ready. Live audio and video are not connected in this demo.</span>
        <button className="call-end-button" onClick={() => setCallMode(null)} data-testid="button-end-call"><PhoneOff size={18} /><span>End call</span></button>
      </section>
    </div>}
  </div>;
}

type DirectMessageRow = { id: string; sender_id: string; recipient_id: string; body: string; created_at: string };
type CampusContact = { user_id: string; name: string; handle: string; university: string; bio: string };

function DirectMessagesView({ campus }: { campus: string }) {
  const [userId, setUserId] = useState('');
  const [contacts, setContacts] = useState<CampusContact[]>([]);
  const [messages, setMessages] = useState<DirectMessageRow[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [callMode, setCallMode] = useState<'voice' | 'video' | null>(null);
  const contactById = useMemo(() => new Map(contacts.map((contact) => [contact.user_id, contact])), [contacts]);

  const load = async (initial = false) => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) return;
    setUserId(user.id);
    if (initial) {
      const { data: people, error: peopleError } = await supabase.from('student_profiles')
        .select('user_id,name,handle,university,bio').eq('university', campus).neq('user_id', user.id).order('name');
      if (peopleError) throw peopleError;
      setContacts((people ?? []) as CampusContact[]);
    }
    const { data, error: messageError } = await supabase.from('direct_messages')
      .select('id,sender_id,recipient_id,body,created_at')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: true });
    if (messageError) throw messageError;
    setMessages((data ?? []) as DirectMessageRow[]);
  };

  useEffect(() => {
    let active = true;
    void load(true).catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : 'Could not load messages.'); });
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load().catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : 'Could not refresh messages.'); });
    }, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [campus]);

  const threadIds = [...new Set(messages.map((message) => message.sender_id === userId ? message.recipient_id : message.sender_id))];
  const knownIds = [...new Set([...threadIds, ...contacts.map((contact) => contact.user_id)])];
  const filteredIds = knownIds.filter((id) => {
    const contact = contactById.get(id);
    const participantMessages = messages.filter((message) => message.sender_id === id || message.recipient_id === id);
    return `${contact?.name ?? ''} ${contact?.handle ?? ''} ${participantMessages.map((message) => message.body).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase());
  });
  const selected = contactById.get(selectedId);
  const selectedMessages = messages.filter((message) => message.sender_id === selectedId || message.recipient_id === selectedId);
  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !selectedId || busy) return;
    setBusy(true); setError('');
    try {
      const { error: sendError } = await supabase.from('direct_messages').insert({ sender_id: userId, recipient_id: selectedId, body });
      if (sendError) throw sendError;
      setDraft('');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not send this message.');
    } finally { setBusy(false); }
  };

  return <div className="page-wrap">
    <div className="eyebrow"><MessageCircle size={14} /> Keep the momentum moving</div>
    <h1 className="section-title" style={{ fontSize: 42, marginBottom: 7 }}>Messages.</h1>
    <p className="section-kicker" style={{ marginBottom: 25 }}>Private conversations with people in your campus community.</p>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="messages-layout">
      <section className="inbox-panel" aria-label="Campus members and conversations">
        <div className="inbox-heading"><h2>Campus members <span>{knownIds.length}</span></h2></div>
        <div className="search-wrap message-search"><Search /><input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people or messages" aria-label="Search people or messages" /></div>
        <div className="message-list">{filteredIds.map((id) => {
          const contact = contactById.get(id);
          const last = [...messages].reverse().find((message) => message.sender_id === id || message.recipient_id === id);
          const name = contact?.name ?? 'Campus member';
          return <button className={`message-card ${selectedId === id ? 'selected' : ''}`} key={id} onClick={() => setSelectedId(id)}>
            <div className="creator-avatar" style={{ background: '#80d1c1' }}>{initials(name)}</div>
            <div className="message-summary"><strong>{name}</strong><p>{last?.body ?? contact?.handle ?? 'Start a conversation'}</p></div>
            {last && <span className="message-time">{new Date(last.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
          </button>;
        })}{filteredIds.length === 0 && <div className="message-empty">No campus members yet. Invite others to join HUSTL.</div>}</div>
      </section>
      <section className="conversation-panel" aria-label={selected ? `Chat with ${selected.name}` : 'Conversation'}>
        {selected ? <>
          <header className="conversation-heading"><div className="creator-avatar" style={{ background: '#80d1c1' }}>{initials(selected.name)}</div><div className="conversation-person"><strong>{selected.name}</strong><span>{selected.handle} · {selected.university}</span></div>
            <div className="conversation-actions"><button className="call-action" onClick={() => setCallMode('voice')} aria-label="Voice call preview" title="Voice call"><Phone size={17} /></button><button className="call-action" onClick={() => setCallMode('video')} aria-label="Video call preview" title="Video call"><Video size={17} /></button></div>
          </header>
          <div className="conversation-history">{selectedMessages.map((message) => <article className={`chat-bubble ${message.sender_id === userId ? 'mine' : ''}`} key={message.id}><p>{message.body}</p><span>{message.sender_id === userId ? 'You' : selected.name} · {new Date(message.created_at).toLocaleString()}</span></article>)}{selectedMessages.length === 0 && <div className="empty-state conversation-empty"><MessageCircle size={26} /><h3>Start the conversation</h3><p>Say hello to {selected.name}.</p></div>}</div>
          <form className="message-composer" onSubmit={sendMessage}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={`Message ${selected.name.split(' ')[0]}…`} aria-label={`Message ${selected.name}`} maxLength={4000} /><button type="submit" className="send-message-button" disabled={!draft.trim() || busy} aria-label="Send message"><Send size={16} /></button></form>
          <div className="conversation-foot"><span>Messages are saved securely to HUSTL.</span><span>Only you and {selected.name} can view this chat.</span></div>
        </> : <div className="empty-state conversation-empty"><MessageCircle size={26} /><h3>Select a campus member</h3><p>Choose a person to start or continue a private conversation.</p></div>}
      </section>
    </div>
    {callMode && selected && <div className="call-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setCallMode(null); }}><section className={`call-card ${callMode}`} role="dialog" aria-modal="true"><button className="call-close" onClick={() => setCallMode(null)} aria-label="Close call preview"><X size={18} /></button><div className="call-avatar" style={{ background: '#80d1c1' }}>{initials(selected.name)}</div><h2>{selected.name}</h2><p>{callMode === 'voice' ? 'Voice call' : 'Video call'} preview</p><span className="call-preview-note">Live calls need a separate audio/video service and are not connected yet.</span><button className="call-end-button" onClick={() => setCallMode(null)}><PhoneOff size={18} /><span>Close</span></button></section></div>}
  </div>;
}

function PosterView({ gigs, onPost }: { gigs: Gig[]; onPost: () => void }) {
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);
  const [pitches, setPitches] = useState<Array<{ id: string; pitch: string; status: string; created_at: string; applicant: { name: string; handle: string } | null }>>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!selectedGig) { setPitches([]); return; }
    let active = true;
    setLoading(true); setError('');
    void supabase.from('gig_applications').select('id,pitch,status,created_at,applicant:student_profiles!gig_applications_applicant_id_fkey(name,handle)')
      .eq('gig_id', selectedGig.id).order('created_at', { ascending: false })
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError) setError(queryError.message);
        else setPitches((data ?? []) as unknown as typeof pitches);
      }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selectedGig]);
  const review = async (id: string, status: 'accepted' | 'declined') => {
    setError('');
    const { error: updateError } = await supabase.from('gig_applications').update({ status }).eq('id', id);
    if (updateError) { setError(updateError.message); return; }
    setPitches((items) => items.map((item) => item.id === id ? { ...item, status } : item));
  };
  const pendingPitches = gigs.reduce((total, gig) => total + gig.applicants, 0);
  const openGigs = gigs.filter((gig) => gig.status === 'Open').length;
  return <div className="page-wrap"><div className="eyebrow"><LayoutDashboard size={14} /> Your side of the table</div><h1 className="section-title" style={{ fontSize: 42, marginBottom: 7 }}>Poster dashboard.</h1><p className="section-kicker" style={{ marginBottom: 27 }}>Your gigs and pitches, live from HUSTL.</p>
    <div className="dashboard-grid"><div className="dash-stat"><small>Open gigs</small><strong>{openGigs}</strong><span>your live asks</span></div><div className="dash-stat" style={{ background: '#e9c754' }}><small>Pitches received</small><strong>{pendingPitches}</strong><span>across your gigs</span></div><div className="dash-stat" style={{ background: '#80d1c1' }}><small>Budget range</small><strong>{gigs.length ? `₹${gigs.reduce((sum, gig) => sum + (getGigPriceRange(gig.budget)?.[0] ?? 0), 0).toLocaleString('en-IN')}` : '₹0'}</strong><span>combined minimum budget</span></div></div>
    <div className="section-head"><div><h2 className="section-title">Your recent asks</h2><p className="section-kicker">Review each pitch and choose who to work with.</p></div><button className="button button-primary" onClick={onPost} data-testid="button-dashboard-post"><Plus size={15} /> Post another gig</button></div>
    {gigs.length ? <div className="gigs-grid">{gigs.map((gig) => <article className="gig-card" key={gig.id}><div className="gig-top"><span className="category-stamp">{gig.status}</span><span style={{ color: 'rgba(35,28,71,.6)', fontSize: 10 }}>{gig.applicants} pitches</span></div><h3 className="gig-title">{gig.title}</h3><p className="gig-desc">{gig.description}</p><div className="gig-footer"><div className="gig-meta"><span className="gig-budget">{gig.budget}</span><span>Closes {gig.deadline}</span></div><button className="card-cta" onClick={() => setSelectedGig(gig)} data-testid={`button-review-${gig.id}`}>Review pitches</button></div></article>)}</div> : <div className="empty-state"><BriefcaseBusiness size={26} /><h3>You have not posted a gig yet.</h3><p>Post your first ask and manage replies here.</p><button className="button button-primary" onClick={onPost}>Post a gig <Plus size={15} /></button></div>}
    {selectedGig && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setSelectedGig(null); }}><section className="modal" role="dialog" aria-modal="true" aria-label={`Pitches for ${selectedGig.title}`}><div className="modal-top"><div><h2>Pitches for {selectedGig.title}</h2><p>Choose a person for your project.</p></div><button className="modal-close" onClick={() => setSelectedGig(null)} aria-label="Close pitches"><X size={19} /></button></div>{error && <p className="form-error" role="alert">{error}</p>}{loading ? <p>Loading pitches…</p> : pitches.length ? <div className="creator-list">{pitches.map((pitch) => <article className="panel" key={pitch.id} style={{ marginBottom: 12 }}><div className="creator-name">{pitch.applicant?.name ?? 'Campus member'} · {pitch.applicant?.handle ?? ''}</div><p style={{ marginTop: 10, whiteSpace: 'pre-wrap' }}>{pitch.pitch}</p><div className="gig-footer"><span className="category-stamp">{pitch.status}</span>{pitch.status === 'pending' && <div className="modal-actions"><button className="button button-ghost" onClick={() => void review(pitch.id, 'declined')}>Decline</button><button className="button button-primary" onClick={() => void review(pitch.id, 'accepted')}>Accept</button></div>}</div></article>)}</div> : <div className="empty-state"><MessageCircle size={25} /><h3>No pitches yet.</h3><p>Applicants will show here when someone responds.</p></div>}<div className="modal-actions"><button className="button button-ghost" onClick={() => setSelectedGig(null)}>Done</button></div></section></div>}
  </div>;
}

function PostGigModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (input: { title: string; description: string; category: string; budgetMin: number; budgetMax: number }) => Promise<void> }) {
  const [title, setTitle] = useState('');
  const [budget, setBudget] = useState('');
  const [category, setCategory] = useState('Design');
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    const amount = Number(budget);
    if (!Number.isFinite(amount) || amount < 50 || amount > 1200) {
      setError('Enter a budget from ₹50 to ₹1,200.');
      return;
    }
    if (!title.trim()) return;
    setBusy(true);
    try {
      await onSubmit({ title: title.trim(), description: details.trim(), category, budgetMin: amount, budgetMax: amount });
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not publish your gig. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><form className="modal" onSubmit={submit} data-testid="modal-post-gig"><div className="modal-top"><div><h2>Post a gig.</h2><p>Make the ask clear. Leave room for somebody to make it better.</p></div><button type="button" className="modal-close" onClick={onClose} aria-label="Close modal" data-testid="button-close-post"><X size={19} /></button></div><div className="form-grid"><label className="form-label">What do you need? <input className="form-control" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Make my club flyer less boring" data-testid="input-gig-title" required /></label><div className="form-two"><label className="form-label">Category <select className="form-control" value={category} onChange={(event) => setCategory(event.target.value)} data-testid="select-gig-category">{['Design', 'Video', 'Writing', 'Code', 'Photo', 'Music', 'Marketing'].map((item) => <option key={item}>{item}</option>)}</select></label><label className="form-label">Budget (₹50–₹1,200) <input className="form-control" type="number" min="50" max="1200" step="1" value={budget} onChange={(event) => { setBudget(event.target.value); setError(''); }} placeholder="e.g. 750" data-testid="input-gig-budget" required /></label></div><label className="form-label">The useful details <textarea className="form-control" value={details} onChange={(event) => setDetails(event.target.value)} placeholder="What should a great result feel like?" rows={4} data-testid="textarea-gig-details" /></label>{error && <p className="form-error" role="alert">{error}</p>}</div><div className="modal-actions"><button type="button" className="button button-ghost" onClick={onClose} data-testid="button-cancel-post">Not yet</button><button type="submit" className="button button-primary" data-testid="button-submit-post">Publish gig <ArrowUpRight size={14} /></button></div></form></div>;
}

function PitchModal({ gig, onClose, onSubmit }: { gig: Gig; onClose: () => void; onSubmit: (pitch: string) => Promise<void> }) {
  const [pitch, setPitch] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setBusy(true);
    try { await onSubmit(pitch.trim()); onClose(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not send your pitch. Please try again.'); }
    finally { setBusy(false); }
  };
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><form className="modal" onSubmit={submit}><div className="modal-top"><div><div className="category-stamp" style={{ display: 'inline-block' }}>{gig.category}</div><h2 style={{ marginTop: 14 }}>{gig.title}</h2><p>Tell {gig.poster} why you are the person for this little mission.</p></div><button type="button" className="modal-close" onClick={onClose} aria-label="Close modal" data-testid="button-close-pitch"><X size={19} /></button></div><label className="form-label">Your pitch <textarea className="form-control" value={pitch} onChange={(event) => setPitch(event.target.value)} placeholder="I can help because..." rows={6} minLength={20} maxLength={2000} data-testid="textarea-pitch" required /></label>{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="button button-ghost" onClick={onClose} data-testid="button-cancel-pitch">Cancel</button><button type="submit" className="button button-primary" disabled={busy} data-testid="button-submit-pitch"><Send size={14} /> {busy ? 'Sending…' : 'Send pitch'}</button></div></form></div>;
}

function CreatorModal({ creator, onClose }: { creator: Creator; onClose: () => void }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><div className="modal"><div className="modal-top"><div><h2>Meet the maker.</h2><p>A little more context before you make the ask.</p></div><button className="modal-close" onClick={onClose} aria-label="Close modal" data-testid="button-close-creator"><X size={19} /></button></div><div className="creator-detail"><div className="creator-avatar" style={{ background: creator.avatarColor }}>{initials(creator.name)}</div><div><h3>{creator.name}</h3><p>{creator.handle} · {creator.campus}</p></div></div><div className="stats-row" style={{ marginBottom: 19 }}><div className="stat"><strong>{creator.rating}</strong><span>rating</span></div><div className="stat"><strong>{creator.completedProjects}</strong><span>projects done</span></div><div className="stat"><strong><ShieldCheck size={17} /></strong><span>verified</span></div></div><div className="tag-row" style={{ marginBottom: 22 }}>{creator.skills.map((skill) => <span className="tag" key={skill}>{skill}</span>)}</div><button className="button button-primary" style={{ width: '100%' }} onClick={onClose} data-testid="button-message-creator"><MessageCircle size={14} /> Start a conversation</button></div></div>;
}

function MainApp() {
  const [location, setLocation] = useLocation();
  const view: View = location === '/explore' ? 'explore' : location === '/messages' ? 'messages' : location === '/profile' ? 'profile' : location === '/poster' ? 'poster' : 'home';
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [currentUserId, setCurrentUserId] = useState('');
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataError, setDataError] = useState('');
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState('');
  const [saved, setSaved] = useState<string[]>([]);
  const [mode, setMode] = useState<'gigs' | 'reels'>('gigs');
  const [category, setCategory] = useState('All');
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const currentGig = useMemo(() => modal?.kind === 'pitch' ? gigs.find((gig) => gig.id === modal.id) : undefined, [modal, gigs]);
  const navigate = (next: View) => setLocation(next === 'home' ? '/' : `/${next}`);
  const showToast = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 3000); };
  const loadGigs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from('gigs')
      .select('*, poster:student_profiles!gigs_owner_id_fkey(name,handle), application_count:gig_applications(count)')
      .or(`status.eq.open,owner_id.eq.${user.id}`)
      .order('created_at', { ascending: false });
    if (error) { setDataError(error.message); return; }
    setDataError('');
    setGigs(((data ?? []) as unknown as GigRow[]).map(formatGig));
  };
  const loadSavedGigs = async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) { setSaved([]); return; }
    const { data, error } = await supabase.from('saved_gigs').select('gig_id');
    if (error) throw error;
    setSaved((data ?? []).map((row) => row.gig_id));
  };
  const loadProfile = async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user?.email) { setStudentProfile(null); return; }
    setCurrentUserId(user.id);
    const { data, error } = await supabase.from('student_profiles').select('*').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    if (!data) {
      setStudentProfile(null);
      setCurrentUserId('');
      await supabase.auth.signOut();
      return;
    }
    const row = data as unknown as StudentProfileRow;
    setStudentProfile({ name: row.name, handle: row.handle, phone: row.phone, email: user.email, location: row.location, university: row.university, bio: row.bio, skills: row.skills ?? [] });
    await Promise.all([loadGigs(), loadSavedGigs()]);
  };
  useEffect(() => {
    let active = true;
    if (!supabaseConfigured) { setAuthLoading(false); return () => { active = false; }; }
    void loadProfile().catch((caught) => { if (active) setDataError(caught instanceof Error ? caught.message : 'Could not load your account.'); })
      .finally(() => { if (active) setAuthLoading(false); });
    return () => { active = false; };
  }, []);
  const toggleSaved = async (id: string) => {
    const wasSaved = saved.includes(id);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) { showToast('Sign in again to save gigs.'); return; }
    const result = wasSaved
      ? await supabase.from('saved_gigs').delete().eq('user_id', user.id).eq('gig_id', id)
      : await supabase.from('saved_gigs').upsert({ user_id: user.id, gig_id: id }, { onConflict: 'user_id,gig_id', ignoreDuplicates: true });
    if (result.error) { showToast(result.error.message); return; }
    setSaved((items) => wasSaved ? items.filter((item) => item !== id) : [...new Set([...items, id])]);
    showToast(wasSaved ? 'Removed from saved gigs.' : 'Saved for later.');
  };
  const handleAuthSuccess = (profile: StudentProfile) => {
    setStudentProfile(profile);
    void supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? ''));
    void Promise.all([loadGigs(), loadSavedGigs()]).catch((caught) => setDataError(caught instanceof Error ? caught.message : 'Could not load your account data.'));
  };
  const handleLogout = () => {
    void supabase.auth.signOut();
    setStudentProfile(null);
    setCurrentUserId('');
    setGigs([]);
    setSaved([]);
  };
  const openStory = (id: string) => {
    const index = stories.findIndex((story) => story.id === id);
    if (index >= 0) setActiveStoryIndex(index);
  };
  if (authLoading) return <main className="auth-page"><section className="auth-card"><div className="auth-brand"><span className="auth-brand-word">HUSTL</span><Sparkles size={22} /></div><p>Loading your campus…</p></section></main>;
  if (!studentProfile) return <AuthView onSuccess={handleAuthSuccess} />;
  return <AppShell view={view} onNavigate={navigate} onPost={() => setModal({ kind: 'post' })} onLogout={handleLogout} userId={currentUserId}>
    {dataError && <div className="auth-error" role="alert">{dataError}</div>}
    {view === 'home' && <HomeView gigs={gigs} onPost={() => setModal({ kind: 'post' })} onPitch={(id) => setModal({ kind: 'pitch', id })} onOpenStory={openStory} saved={saved} toggleSaved={toggleSaved} onCreator={(handle) => setModal({ kind: 'creator', id: handle })} mode={mode} setMode={setMode} category={category} setCategory={setCategory} />}
    {view === 'explore' && <ExploreView gigs={gigs} onPitch={(id) => setModal({ kind: 'pitch', id })} saved={saved} toggleSaved={toggleSaved} />}
    {view === 'messages' && <DirectMessagesView campus={studentProfile.university} />}
    {view === 'profile' && <ProfileView profile={studentProfile} gigs={gigs} saved={saved} toggleSaved={toggleSaved} onPitch={(id) => setModal({ kind: 'pitch', id })} onCreator={(handle) => setModal({ kind: 'creator', id: handle })} />}
    {view === 'poster' && <PosterView gigs={gigs.filter((gig) => gig.ownerId === currentUserId)} onPost={() => setModal({ kind: 'post' })} />}
    {modal?.kind === 'post' && <PostGigModal onClose={() => setModal(null)} onSubmit={async (input) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sign in again to post a gig.');
      const { error } = await supabase.from('gigs').insert({ ...input, owner_id: user.id, campus: studentProfile.university, tags: [], work_types: ['Online'] });
      if (error) throw error;
      await loadGigs();
      showToast('Your gig is live — let the right person find it.');
    }} />}
    {modal?.kind === 'pitch' && currentGig && <PitchModal gig={currentGig} onClose={() => setModal(null)} onSubmit={async (pitch) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sign in again to send your pitch.');
      const { error } = await supabase.from('gig_applications').insert({ gig_id: currentGig.id, applicant_id: user.id, pitch });
      if (error) throw error;
      await loadGigs();
      showToast('Pitch sent — good luck, make it memorable.');
    }} />}
    {modal?.kind === 'creator' && <CreatorModal creator={creators.find((creator) => creator.handle === modal.id) ?? creators[0]} onClose={() => setModal(null)} />}
    {activeStoryIndex !== null && <StoryViewer story={stories[activeStoryIndex]} index={activeStoryIndex} onClose={() => setActiveStoryIndex(null)} onPrevious={() => setActiveStoryIndex((index) => index === null ? null : (index + stories.length - 1) % stories.length)} onNext={() => setActiveStoryIndex((index) => index === null ? null : (index + 1) % stories.length)} />}
    {toast && <div className="toast" role="status" data-testid="status-toast"><Check size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />{toast}</div>}
  </AppShell>;
}

function Router() {
  return <ErrorBoundary resetKey={window.location.pathname}><Switch><Route path="/" component={MainApp} /><Route path="/explore" component={MainApp} /><Route path="/messages" component={MainApp} /><Route path="/profile" component={MainApp} /><Route path="/poster" component={MainApp} /><Route component={NotFound} /></Switch></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;
