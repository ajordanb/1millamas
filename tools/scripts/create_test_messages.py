import asyncio
import pathlib
import sys
from datetime import datetime, UTC, timedelta

from loguru import logger
from motor.motor_asyncio import AsyncIOMotorClient

sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))
from settings import settings  # noqa: E402


def _reply(text: str, author: str, offset_hours: float, base: datetime) -> dict:
    return {"text": text, "author": author, "sent_at": base + timedelta(hours=offset_hours)}


def build_fixtures(now: datetime) -> list[dict]:
    """20 seed messages with varied statuses, reply mixes, and unread flags."""

    def at(hours_ago: float) -> datetime:
        return now - timedelta(hours=hours_ago)

    fixtures: list[dict] = []

    # --- 4 pending (just came in, admin hasn't responded) ---
    fixtures.append({
        "name": "Priya Raman",
        "email": "priya.raman@hallmark-labs.io",
        "message": "Saw your writeup on the MongoDB → Postgres migration. We're about to do the same at about 8x the scale. Would you be open to a short call next week?",
        "status": "pending",
        "created_at": at(0.5),
    })
    fixtures.append({
        "name": "Dmitri Volkov",
        "email": "dmitri@volkov.studio",
        "message": "Quick one: the contact form on the portfolio throws a 500 if I paste a link into the message. Probably the URL validator. Not urgent, just FYI.",
        "status": "pending",
        "created_at": at(2),
    })
    fixtures.append({
        "name": "Hiring Team",
        "email": "careers@northstar-robotics.com",
        "message": "Hello — we're hiring a senior platform engineer and came across your portfolio. Compensation is competitive and the team is fully remote. Interested in chatting?",
        "status": "pending",
        "created_at": at(6),
    })
    fixtures.append({
        "name": "Anon",
        "email": "thegreatvibes2024@protonmail.com",
        "message": "interesting work. what's your rate for a weekend project",
        "status": "pending",
        "created_at": at(14),
    })

    # --- 10 open (active conversations in various shapes) ---

    # agent replied, waiting on visitor, unread=false
    base = at(38)
    fixtures.append({
        "name": "Maya Chen",
        "email": "maya.chen@parallax.dev",
        "message": "Love the little easter egg on the keyboard shortcut page. Small bug though: the search modal doesn't close on Escape if you've clicked into an input first. Firefox 121 on macOS.",
        "status": "open",
        "created_at": base,
        "replies": [
            _reply(
                "Thanks Maya — good catch. I repro'd it and it's a stopPropagation I'm missing on the input handler. Pushing a fix later today. Mind if I link to your bug report in the commit?",
                "agent", 0.4, base,
            ),
        ],
        "unread_by_agent": False,
    })

    # visitor replied back, unread=true (sidebar badge should light up)
    base = at(52)
    fixtures.append({
        "name": "Tomás Ibáñez",
        "email": "tomas@ibanez.engineering",
        "message": "Do you have the source for the particle background effect on your landing page anywhere? It's really well done and I'd like to study it.",
        "status": "open",
        "created_at": base,
        "replies": [
            _reply(
                "Hey Tomás — it's a fairly plain canvas sim, nothing exotic. I've been meaning to write it up. Happy to send the snippet if you want, or if you can wait ~a week I'll have a blog post.",
                "agent", 1.2, base,
            ),
            _reply(
                "The snippet would be great, thank you. I'm prototyping something for a conference talk next Thursday so I can't wait for the blog post. Totally fine if you want to keep the writeup exclusive.",
                "visitor", 4.0, base,
            ),
        ],
        "unread_by_agent": True,
    })

    # long multi-turn thread, visitor most recent, unread=true
    base = at(70)
    fixtures.append({
        "name": "Rebecca Olin",
        "email": "rebecca.olin@stoneridge.co",
        "message": "Hi! I found you via the Django meetup site. We're a small architecture firm and our internal project tracker is an absolute mess of spreadsheets. Do you take on that kind of work?",
        "status": "open",
        "created_at": base,
        "replies": [
            _reply(
                "Hi Rebecca — I do take some small-shop work, but I'd want to understand the shape first. Roughly how many projects concurrently, how many people on the team, and what's the one thing that bothers you most about the spreadsheet flow today?",
                "agent", 2.0, base,
            ),
            _reply(
                "15-20 active projects, team of 7 (5 architects + 2 admin). The worst thing is that nobody knows which revision of a drawing is current — we all pass PDFs around and it's a nightmare when a contractor asks for 'the latest'.",
                "visitor", 18.0, base,
            ),
            _reply(
                "Got it. That's a versioning + source-of-truth problem more than a tracker problem. I'd want to dig into how you currently name files and who hands off to whom before quoting anything. Do you have ~30 min next week for a call?",
                "agent", 20.0, base,
            ),
            _reply(
                "Yes, Tuesday afternoon works. I'll send a calendar invite to this address. Thank you for taking it seriously — I talked to two other folks and they both wanted to sell me Airtable templates.",
                "visitor", 27.0, base,
            ),
        ],
        "unread_by_agent": True,
    })

    # pending → just answered, agent reply is the only one, unread=false
    base = at(92)
    fixtures.append({
        "name": "Yusuf Kaya",
        "email": "yusuf.kaya@helix-bio.com",
        "message": "Could you share which observability stack you recommend for a ~10-service Python monolith starting to split into microservices? We're on AWS.",
        "status": "open",
        "created_at": base,
        "replies": [
            _reply(
                "Short answer: OpenTelemetry SDK in every service, OTEL collector as sidecar, ship to Grafana Tempo for traces + Loki for logs + Mimir for metrics. Cheap if you self-host, and nothing is locked to a vendor. Happy to share the collector config I use.",
                "agent", 5.0, base,
            ),
        ],
        "unread_by_agent": False,
    })

    # old thread with agent reply, gone cold, unread=false
    base = at(120)
    fixtures.append({
        "name": "Linh Pham",
        "email": "linhpham@cascade.studio",
        "message": "Following up on our earlier email — did you get a chance to review the SOW? No rush, just making sure it didn't land in spam.",
        "status": "open",
        "created_at": base,
        "replies": [
            _reply(
                "Linh — I have it open, sorry for the lag. I'll return the markup by end of day Thursday. I want to push back on the IP clause in section 4 but everything else looks fair.",
                "agent", 3.0, base,
            ),
        ],
        "unread_by_agent": False,
    })

    # visitor followup, unread=true, short content
    base = at(144)
    fixtures.append({
        "name": "Jordan Ek",
        "email": "jordan@eksoftware.com",
        "message": "Is the blog RSS still alive? Feedbin is showing no updates since February but the site has new posts.",
        "status": "open",
        "created_at": base,
        "replies": [
            _reply("Hmm — the feed generator changed last release. Let me check.", "agent", 0.3, base),
            _reply("All good now, thanks for the heads up. Feedbin picked up the backlog.", "visitor", 30.0, base),
        ],
        "unread_by_agent": True,
    })

    # long-winded visitor, unreplied agent, agent follow-up needed, unread=true
    base = at(168)
    fixtures.append({
        "name": "Elena Marchetti",
        "email": "elena@marchetti-consulting.it",
        "message": "Ciao! I'm writing from Milan. I'm a management consultant transitioning into technical roles and I've been studying your code samples as a learning exercise. I particularly appreciate your commentary on trade-offs in the README files — most portfolios just show polished end results without the reasoning. I have two questions if you have time: (1) when you're starting a new project, how do you decide between a fat model + thin service vs. thin model + fat service? (2) do you have a reading list for backend engineering that you would recommend for someone coming from a business background?",
        "status": "open",
        "created_at": base,
        "replies": [
            _reply(
                "Ciao Elena — glad the READMEs are useful, I try. On (1): I default to fat models when the invariants belong to the entity (you can't have a negative bank balance, an order can't be shipped twice) and fat services when the logic is about orchestration between multiple entities. On (2): 'Designing Data-Intensive Applications' by Kleppmann is table stakes. After that, 'Database Internals' by Petrov and anything by Pat Helland. I'll pull a longer list if useful.",
                "agent", 4.5, base,
            ),
        ],
        "unread_by_agent": True,
    })

    # spam-ish, left open, unread=false
    base = at(196)
    fixtures.append({
        "name": "Growth Strategist",
        "email": "hello@leadsupercharge.net",
        "message": "Are you getting enough qualified leads from your portfolio? Our AI-powered SEO agents helped 300+ developers 10x their inbound traffic in 30 days. Book a free strategy call.",
        "status": "open",
        "created_at": base,
        "replies": [],
        "unread_by_agent": False,
    })

    # agent replied, visitor replied, agent replied again, unread=false
    base = at(220)
    fixtures.append({
        "name": "Wen Zhao",
        "email": "wen.zhao@meridian-health.org",
        "message": "We're evaluating candidates for a short-term FHIR integration project. Your healthcare section mentions HL7 experience but doesn't go into detail — do you have FHIR R4 resource modeling experience specifically?",
        "status": "open",
        "created_at": base,
        "replies": [
            _reply(
                "Yes — most recently I mapped Patient, Observation, Encounter, and MedicationRequest for a lab integration. I can share redacted code on request. Is this a mapping-heavy project or more on the exchange side (SMART-on-FHIR, bulk data)?",
                "agent", 6.0, base,
            ),
            _reply("Mostly exchange. We need SMART-on-FHIR launch + bulk data export from Epic.", "visitor", 10.0, base),
            _reply(
                "Good — I've done the launch flow before but not bulk export. Happy to take it on with the caveat that the first week is me getting up to speed on $export and $async. If that's acceptable I'll send a proposal tomorrow.",
                "agent", 12.0, base,
            ),
        ],
        "unread_by_agent": False,
    })

    # unread=true, short urgent-feeling bug report
    base = at(244)
    fixtures.append({
        "name": "Kai Thornton",
        "email": "kai@thornton.games",
        "message": "Login form is broken on mobile Safari. Tap the Google button and nothing happens. Working on desktop Chrome.",
        "status": "open",
        "created_at": base,
        "replies": [
            _reply(
                "Kai — confirmed, iOS 17 blocks the popup because it's triggered from an async handler. Pushing a fix to use a redirect flow on mobile tonight.",
                "agent", 0.8, base,
            ),
            _reply("fix works. thanks for the turnaround.", "visitor", 16.0, base),
        ],
        "unread_by_agent": True,
    })

    # --- 6 closed (handled; no unread) ---

    base = at(300)
    fixtures.append({
        "name": "Samir Patel",
        "email": "samir@patel.consulting",
        "message": "Do you have availability in Q2 for a ~3 month engagement? Data platform work, roughly 20h/wk.",
        "status": "closed",
        "created_at": base,
        "replies": [
            _reply("Samir — booked through the end of Q2, but July onward is open. Would that work?", "agent", 3.0, base),
            _reply("Sadly we need someone sooner. Good luck with the current work.", "visitor", 20.0, base),
            _reply("Understood. Keep me in mind for future things.", "agent", 22.0, base),
        ],
        "unread_by_agent": False,
    })

    base = at(360)
    fixtures.append({
        "name": "Ines Bellavia",
        "email": "ines.bellavia@polaris-labs.com",
        "message": "Resolved: figured out the issue with the deploy script on my end. Cloudflare's new zero-trust tunnel was silently blocking the webhook. Thanks for pointing me at the logs.",
        "status": "closed",
        "created_at": base,
        "replies": [
            _reply("Glad you found it — Cloudflare's zero-trust defaults are aggressive. Want me to close the ticket?", "agent", 2.0, base),
            _reply("Yes please, all resolved.", "visitor", 3.0, base),
        ],
        "unread_by_agent": False,
    })

    base = at(420)
    fixtures.append({
        "name": "Crypto Opportunities",
        "email": "deals@bitquantum-invest.co",
        "message": "Exclusive pre-sale for accredited investors only. 12x projected ROI in 18 months. Reply YES to receive whitepaper.",
        "status": "closed",
        "created_at": base,
        "replies": [],
        "unread_by_agent": False,
    })

    base = at(500)
    fixtures.append({
        "name": "David Aoki",
        "email": "david.aoki@aoki.co.jp",
        "message": "Quick question about the docker-compose file in your auth-service repo — why two Redis instances? Couldn't you use one with multiple DBs?",
        "status": "closed",
        "created_at": base,
        "replies": [
            _reply(
                "Legit question. The sessions one has persistence off and different eviction, the cache one uses allkeys-lru. Could share an instance with per-DB configs but it gets confusing fast and Redis is cheap. Preference, not a hard rule.",
                "agent", 4.0, base,
            ),
            _reply("Makes sense. Thanks!", "visitor", 6.0, base),
        ],
        "unread_by_agent": False,
    })

    base = at(580)
    fixtures.append({
        "name": "Fatima Al-Sayed",
        "email": "fatima@alsayed.dev",
        "message": "Just wanted to say the article on gradual typing in Python was the thing that finally made me understand Protocols. Bookmarked.",
        "status": "closed",
        "created_at": base,
        "replies": [
            _reply("Thanks Fatima — those took forever to write so it's nice to hear. Closing this out.", "agent", 8.0, base),
        ],
        "unread_by_agent": False,
    })

    base = at(680)
    fixtures.append({
        "name": "Ben Schaefer",
        "email": "ben.schaefer@fieldwork.ag",
        "message": "Would you be open to reviewing a ~500-line PR for me? It's a rewrite of our sync engine in Go and I want a second set of eyes before we merge. Happy to pay your hourly.",
        "status": "closed",
        "created_at": base,
        "replies": [
            _reply(
                "Ben — happy to. Send me the diff as a patch or a PR link with read access. Typical turnaround is 2-3 business days. Rate is the same as dev work.",
                "agent", 4.0, base,
            ),
            _reply("Sent. Thanks.", "visitor", 6.0, base),
            _reply(
                "Reviewed. Left 14 comments, 3 are blocking (concurrency on the ingest channel, missing ctx cancellation, SQL-injection-adjacent string-building). The rest are taste. Invoice coming separately.",
                "agent", 60.0, base,
            ),
        ],
        "unread_by_agent": False,
    })

    return fixtures


async def main() -> None:
    client = AsyncIOMotorClient(settings.db_conn_str)
    col = client[settings.db_name]["Message"]

    now = datetime.now(UTC)
    fixtures = build_fixtures(now)

    docs: list[dict] = []
    for fx in fixtures:
        docs.append({
            "name": fx["name"],
            "email": fx["email"],
            "message": fx["message"],
            "status": fx["status"],
            "priority": "medium",
            "created_at": fx["created_at"],
            "replies": fx.get("replies", []),
            "unread_by_agent": fx.get("unread_by_agent", False),
        })

    result = await col.insert_many(docs)
    logger.info("Inserted {} messages into {}.{}", len(result.inserted_ids), settings.db_name, "Message")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
