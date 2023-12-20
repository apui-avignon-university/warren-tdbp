"""Warren API v1 tdbp router."""

import logging

from fastapi import APIRouter, Query

from datetime import datetime, timedelta
from typing import List, Optional

from pydantic import BaseModel
from warren.filters import DatetimeRange
from uuid import uuid4
import random
from faker import Faker

router = APIRouter(
    prefix="/tdbp",
)

logger = logging.getLogger(__name__)



fake = Faker()


class Action(BaseModel):
    """Wip."""

    title: dict
    iri: str
    type: str
    activation_date: Optional[datetime] = None
    cohort: List[str]
    activation_rate: float

class SlidingWindow(BaseModel):
    """Wip."""

    window: DatetimeRange
    active_actions: List[Action]
    dynamic_cohort: List[str]

class Score(BaseModel):
    action_id: str
    student_id: str
    value: float

@router.get("/test")
async def test():
    """A simple test endpoint."""
    return "ok"


@router.get("/window")
async def get_window(
        until: datetime,
        course_id: str = Query(alias="courseId")
) -> SlidingWindow:
    """Wip."""

    since = until - timedelta(days=21)

    dynamic_cohort = [f'student_{i}' for i in range(8)]

    active_actions = [
        Action(
            title={'en': f'Ressource {i:02}'},
            iri=i,
            type='resource',
            activation_date=fake.date_time_between_dates(datetime_start=since, datetime_end=until),
            cohort=random.choices(dynamic_cohort),
            activation_rate=fake.pyint(min_value=0, max_value=100)
        ) for i in range(8)
    ]

    active_actions += [
            Action(
                title={'en': f'Activité {i}'},
                iri=i+8,
                type='activity',
                activation_date=fake.date_time_between_dates(datetime_start=since, datetime_end=until),
                cohort=random.choices(dynamic_cohort),
                activation_rate=fake.pyint(min_value=0, max_value=100)
            ) for i in range(10)
        ]

    return SlidingWindow(
        window=DatetimeRange(since=since, until=until),
        dynamic_cohort=dynamic_cohort,
        active_actions=active_actions
    )


@router.get("/score")
async def get_score(
        until: datetime,
        course_id: str = Query(alias="courseId"),
) -> List[List[Score]]:
    """Wip."""

    since = until - timedelta(days=14)
    dynamic_cohort = [f'student_{i}' for i in range(8)]
    active_actions = [
        Action(
            title={'en': f'Ressource {i}'},
            iri=i,
            type='resource',
            activation_date=fake.date_time_between_dates(datetime_start=since, datetime_end=until),
            cohort=random.choices(dynamic_cohort),
            activation_rate=fake.pyint(min_value=0, max_value=100)
        ) for i in range(8)
    ]

    active_actions += [
        Action(
            title={'en': f'Activité {i}'},
            iri=i+8,
            type='activity',
            activation_date=fake.date_time_between_dates(datetime_start=since, datetime_end=until),
            cohort=random.choices(dynamic_cohort),
            activation_rate=fake.pyint(min_value=0, max_value=100)
        ) for i in range(10)
    ]

    scores = []
    for student in dynamic_cohort:

        student_scores = []

        for action in active_actions:
            student_scores.append(
                Score(
                    action_id=action.iri,
                    student_id=student,
                    value=fake.pyint(min_value=0, max_value=100),
                )
            )

        scores.append(student_scores)

    return scores

