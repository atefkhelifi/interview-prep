// Single source of truth for supported techs. Study sheets, workshops and
// interviews all key off `slug`; `topics` drive interview questions and dashboard grouping.

export const LEVELS = ["junior", "mid", "senior"] as const;
export type Level = (typeof LEVELS)[number];

export type Tech = {
  slug: string;
  name: string;
  blurb: string;
  topics: string[];
};

export const techs: Tech[] = [
  {
    slug: "javascript",
    name: "JavaScript / TypeScript",
    blurb: "Core JS, async, TypeScript types and React.",
    topics: ["Core JS", "Async & event loop", "TypeScript", "React"],
  },
  {
    slug: "angular",
    name: "Angular",
    blurb: "Components, DI, RxJS, signals and change detection.",
    topics: ["Components & templates", "Dependency injection", "RxJS", "Change detection & signals", "Routing & forms"],
  },
  {
    slug: "python",
    name: "Python",
    blurb: "Data model, functions, generators, OOP and concurrency.",
    topics: ["Data types & data model", "Functions & decorators", "Iterators & generators", "OOP", "Concurrency", "Web (FastAPI / Django)"],
  },
  {
    slug: "java",
    name: "Java / Spring",
    blurb: "OOP, collections, concurrency, JVM and Spring Boot.",
    topics: ["OOP & core Java", "Collections", "Concurrency", "JVM & memory", "Spring core", "Spring Boot & JPA"],
  },
  {
    slug: "sql",
    name: "SQL & databases",
    blurb: "Joins, aggregation, window functions, indexes and transactions.",
    topics: ["Queries & joins", "Aggregation & window functions", "Indexes & performance", "Transactions & isolation", "Data modeling"],
  },
  {
    slug: "nodejs",
    name: "Node.js / Express",
    blurb: "Event loop, modules, streams, Express middleware and production.",
    topics: ["Event loop & async", "Modules & packages", "Streams & buffers", "Express & middleware", "Security & production"],
  },
  {
    slug: "csharp",
    name: "C# / .NET",
    blurb: "C# language, LINQ, async/await, ASP.NET Core and EF Core.",
    topics: ["C# language & OOP", "LINQ & collections", "Async & tasks", "ASP.NET Core", "Entity Framework Core"],
  },
  {
    slug: "devops",
    name: "Docker & Git",
    blurb: "Branching, rebase vs merge, Dockerfiles, containers and Compose.",
    topics: ["Git basics & branching", "Merge, rebase & history", "Docker images", "Containers, volumes & networks", "Compose & CI"],
  },
];

export function getTech(slug: string): Tech | undefined {
  return techs.find((t) => t.slug === slug);
}
