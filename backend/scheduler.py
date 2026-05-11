"""
APScheduler — runs agent jobs on a cron schedule.
"""

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from loguru import logger
import asyncio


scheduler = BackgroundScheduler()


def _run_async(coro):
    """Run an async coroutine from a sync scheduler job."""
    loop = asyncio.new_event_loop()
    try:
        loop.run_until_complete(coro)
    finally:
        loop.close()


def run_scout():
    from agents.scout import run_all_indexes
    logger.info("Scheduler: starting Scout agent run")
    _run_async(run_all_indexes())


def run_rebalancer():
    from agents.rebalancer import check_and_propose_rebalances
    logger.info("Scheduler: starting Rebalancer agent run")
    _run_async(check_and_propose_rebalances())


def run_narrator():
    from agents.narrator import generate_weekly_content
    logger.info("Scheduler: starting Narrator agent run")
    _run_async(generate_weekly_content())


def run_deposit_monitor():
    from database import SessionLocal
    from services.deposit_monitor import check_deposits
    db = SessionLocal()
    try:
        _run_async(check_deposits(db))
    finally:
        db.close()


def start_scheduler():
    # Scout: daily at 06:00 UTC
    scheduler.add_job(
        run_scout,
        CronTrigger(hour=6, minute=0),
        id="scout_daily",
        replace_existing=True,
    )

    # Rebalancer: every Monday at 08:00 UTC + drift check every 4 hours
    scheduler.add_job(
        run_rebalancer,
        CronTrigger(day_of_week="mon", hour=8, minute=0),
        id="rebalancer_weekly",
        replace_existing=True,
    )
    scheduler.add_job(
        run_rebalancer,
        CronTrigger(hour="*/4", minute=30),
        id="rebalancer_drift_check",
        replace_existing=True,
    )

    # Narrator: every Sunday at 18:00 UTC (content ready before Monday)
    scheduler.add_job(
        run_narrator,
        CronTrigger(day_of_week="sun", hour=18, minute=0),
        id="narrator_weekly",
        replace_existing=True,
    )

    # Deposit monitor: every 2 minutes — detects USDC deposits on Base
    scheduler.add_job(
        run_deposit_monitor,
        IntervalTrigger(minutes=2),
        id="deposit_monitor",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("Scheduler started: Scout (daily 06:00), Rebalancer (Mon 08:00 + drift), Narrator (Sun 18:00), DepositMonitor (2min)")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
