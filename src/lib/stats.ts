import { prisma } from "./db";
import { slugify } from "./slug";
import { techs } from "./techs";
import { workshops } from "./workshops";

const avg = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null);

// Everything the dashboard shows, computed from the user's finished interviews.
export async function getDashboardStats(userId: string) {
  const interviews = await prisma.interview.findMany({
    where: { userId, status: "done", overallScore: { not: null } },
    orderBy: { finishedAt: "asc" },
    select: {
      id: true,
      tech: true,
      level: true,
      overallScore: true,
      finishedAt: true,
      createdAt: true,
      questions: { where: { score: { not: null } }, select: { topic: true, score: true } },
    },
  });

  const trend = interviews.map((i) => ({
    id: i.id,
    date: (i.finishedAt ?? i.createdAt).toISOString(),
    tech: techs.find((t) => t.slug === i.tech)?.name ?? i.tech,
    level: i.level,
    score: i.overallScore!,
  }));

  const perTech = techs.map((t) => {
    const scores = interviews.filter((i) => i.tech === t.slug).map((i) => i.overallScore!);
    const a = avg(scores);
    return { slug: t.slug, name: t.name, count: scores.length, average: a === null ? null : Math.round(a) };
  });

  // Topic averages across all answered questions (0-10).
  const topicMap = new Map<string, { tech: string; topic: string; scores: number[] }>();
  for (const i of interviews) {
    for (const q of i.questions) {
      const key = `${i.tech}|${q.topic}`;
      const entry = topicMap.get(key) ?? { tech: i.tech, topic: q.topic, scores: [] };
      entry.scores.push(q.score!);
      topicMap.set(key, entry);
    }
  }
  const weakSpots = [...topicMap.values()]
    .map((t) => ({
      tech: t.tech,
      techName: techs.find((x) => x.slug === t.tech)?.name ?? t.tech,
      topic: t.topic,
      anchor: slugify(t.topic),
      average: Math.round(avg(t.scores)! * 10) / 10,
      count: t.scores.length,
    }))
    .sort((a, b) => a.average - b.average)
    .slice(0, 5);

  const passedWorkshops = await prisma.workshopAttempt.findMany({
    where: { userId, passed: true },
    distinct: ["workshop"],
    select: { workshop: true },
  });

  const overall = avg(interviews.map((i) => i.overallScore!));
  const best = perTech.filter((t) => t.average !== null).sort((a, b) => b.average! - a.average!)[0];

  return {
    interviewCount: interviews.length,
    workshopsPassed: passedWorkshops.filter((p) => workshops.some((w) => w.slug === p.workshop)).length,
    workshopCount: workshops.length,
    averageScore: overall === null ? null : Math.round(overall),
    bestTech: best ? { name: best.name, average: best.average! } : null,
    trend,
    perTech,
    weakSpots,
  };
}
