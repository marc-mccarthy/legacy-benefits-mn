import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * Target for the deploy's own probes and for manual checks on the instance.
 *
 * Checks the database too: an application that cannot reach Postgres cannot
 * capture a lead, so a release in that state must not be allowed to pass for
 * healthy.
 *
 * What the move off the load balancer changed is the CONSEQUENCE, not the
 * check. There is no rotation to be pulled from any more — one instance serves
 * everything — so a failure here cannot be absorbed by draining a task. It
 * surfaces instead as deploy/deploy.sh refusing to finish: it curls this
 * endpoint after bringing the container up with `compose up -d --wait app`,
 * and a non-200 fails the deploy before the CloudFront invalidation runs. The
 * Deploy workflow then curls it once more through the public site URL in its
 * Smoke test step, which is the last thing a deploy does.
 *
 * Those two are now the ONLY callers, and the sentence that used to stand here
 * got that wrong in a way worth recording rather than quietly correcting. It
 * read "Nothing polls it in the background; no alarm in the observability
 * module is dimensioned on this endpoint." The second clause was true and the
 * first was not. A Route 53 health check, aws_route53_health_check.site,
 * requested this exact path over HTTPS through the distribution every 30
 * seconds, and aws_cloudwatch_metric_alarm.site_health alarmed on its
 * HealthCheckStatus. Both lived in modules/edge — which is how a denial scoped
 * to the observability module came to read as though nothing watched this
 * route at all. Check the module a claim excludes, not only the one it names.
 *
 * Both are deleted now, along with every other alarm in the stack: the nine
 * metric alarms counted in the observability module, its `alerts` SNS topic
 * and its three log metric filters went when that module was removed. That is
 * an accepted loss rather than an oversight, and it is recorded here because
 * it is invisible from this file otherwise — nothing is left that will notice
 * this endpoint returning 503 BETWEEN deploys. Postgres can become unreachable
 * an hour after a green deploy and the first report of it will be a human one.
 */
export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return Response.json({ status: "ok", database: "up" });
  } catch {
    return Response.json(
      { status: "degraded", database: "down" },
      { status: 503 },
    );
  }
}
