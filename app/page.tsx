const pillars = [
  ['Watchlist','Add the exact players you care about and organize them by priority.'],
  ['Match radar','Automatically discover upcoming fixtures for the teams those players belong to.'],
  ['iPhone calendar','Subscribe once to a private scouting calendar so schedule changes flow through.']
];
export default function Home(){return <main className="shell"><div className="eyebrow">SCOUTBOARD / 0.1</div><h1>Your scouting schedule, <span className="accent">automated.</span></h1><p className="lead">A focused workspace for tracking players, finding the matches worth watching, and turning that list into a personal football calendar.</p><section className="grid">{pillars.map(([title,body])=><article className="card" key={title}><div className="eyebrow">{title}</div><h2>{title}</h2><p>{body}</p></article>)}</section></main>}
