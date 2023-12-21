"""Warren TdBP indicators."""

from datetime import datetime, timedelta
from typing import List, Optional

import pandas as pd
from functools import cached_property
from pydantic import HttpUrl
from ralph.backends.http import LRSHTTP
from ralph.backends.http.lrs import LRSQuery
from ralph.conf import LRSHeaders
from warren.backends import lrs_client as async_lrs_client
from warren.filters import DatetimeRange
from warren.indicators import BaseIndicator
from warren.xi import ExperienceRead
from warren.xi.clients import CRUDExperience as async_xi_experience_client

from ..conf import Settings
from .models import ActiveAction, SlidingWindow, StudentScore


class SlidingWindow(BaseIndicator):
    """TODO"""

    course_experiences: List[str] = None
    sliding_window: DatetimeRange = None
    active_actions: List[ActiveAction] = None
    dynamic_cohort: List[str] = None

    def __init__(  # noqa:PLR0913
        self,
        course_id: str,
        until: Optional[datetime] = None,
        sliding_window_size_min: int = Settings.SLIDING_WINDOW_SIZE_MIN,
        active_actions_min: int = Settings.ACTIVE_ACTIONS_MIN,
        dynamic_cohort_min: int = Settings.DYNAMIC_COHORT_MIN,
    ):
        """Initializes sliding window indicator."""
        self.course_id = course_id
        self.sliding_window_size_min = sliding_window_size_min
        self.active_actions_min = active_actions_min
        self.dynamic_cohort_min = dynamic_cohort_min
        self.until = until or datetime.now()

    @property
    async def xi_experience_client(self):
        """To move to BaseIndicator in Warren core."""
        return async_xi_experience_client

    def get_xi_experience_query(self):
        """To move to BaseIndicator in Warren core."""

    async def fetch_experiences(self) -> List[ExperienceRead]:
        """Return actions related to course read from Experience Index."""

        response = await self.xi_experience_client.get(
            f"/api/v1/experiences/{self.course_id}"
        )

        return response.json()["relation_target"]

    def get_lrs_query(self, experience_id) -> LRSQuery:
        """Get the LRS query for fetching required statements."""
        return LRSQuery(
            query={
                "activity": experience_id,
                "until": self.until.isoformat(),
            }
        )

    @property
    def fetch_statements(self) -> pd.DataFrame:
        """Return statements related to course actions read from Learning Record Store."""
        raw_statements = pd.DataFrame()

        for experience in self.course_experiences:
            statements = self.lrs_client.read(
                target="/xAPI/statements",
                query=self.get_lrs_query(experience_id=experience),
            )
            raw_statements.append(pd.json_normalize(statements))

        # Ensure raw_statements are distributed on a timerange >= self.sliding_window_size
        min_datetime = pd.Timestamp(min(raw_statements["timestamp"]))

        if (self.until - min_datetime) < self.sliding_window_size:
            raise Exception(
                f"Floating window can not be computed. Statements are distributed on a timerange lower than {self.sliding_window_size_min} days."
            )

        # Ensure that there are interactions with at least the required min number of course actions
        actions = raw_statements["object.id"].nunique()

        if actions < self.active_actions_min:
            raise Exception(
                f"Active actions can not be computed. Statements are generated from less than {self.active_actions_min} actions."
            )

        # Ensure that the student cohort is at least of the min on the dynamic cohort value.
        cohort = raw_statements["actor.account.name"].nunique()

        if cohort < self.dynamic_cohort_size:
            raise Exception(
                f"Active actions can not be computed. Statements are generated for less than {self.dynamic_cohort_min} students."
            )

        return raw_statements

    def compute(self) -> int:
        """Returns number of course active actions."""
        statements = self.fetch_statements
        min_datetime = pd.Timestamp(min(statements["timestamp"]))
        since = self.until + pd.offsets.Day(-self.sliding_window_size_min)
        active_actions_iris = []

        while since >= min_datetime:
            # Filter on statements emitted within the floating window
            window_statements = statements[since <= statements["timestamp"]]

            # Count unique actors active in the floating window
            temp_dynamic_cohort = window_statements["actor.account.name"].unique()
            temp_dynamic_cohort_size = len(temp_dynamic_cohort)

            # Loop on actions
            actions = (
                window_statements.groupby(["object.id"])["actor.account.name"]
                .nunique()
                .reset_index()
            )

            # Find active actions on the current window
            for idx in actions.index:
                action_id = actions.iloc[idx]["object.id"]
                action_cohort = actions.iloc[idx]["actor.account.name"]

                if (
                    0.1 * temp_dynamic_cohort_size <= action_cohort
                    and action_cohort >= self.dynamic_cohort_min
                ):
                    active_actions_iris.append(action_id)

            if len(active_actions_iris) < self.active_actions_min:
                since -= timedelta(days=1)  # step back from one day
            else:
                self.sliding_window = DatetimeRange(since=since, until=self.until)
                self.dynamic_cohort = temp_dynamic_cohort
                self.active_actions = self._fetch_active_actions_context(
                    active_actions_iris, temp_dynamic_cohort_size
                )

                return SlidingWindow.construct(
                    **{
                        "window": self.sliding_window,
                        "active_actions": self.active_actions,
                        "dynamic_cohort": self.dynamic_cohort,
                    }
                )

        return 0

    def _fetch_active_actions_context(
        self, statements, iris, dynamic_cohort_size: int
    ) -> None:
        """Retrieves contextual information about active actions."""
        active_actions: List[ActiveAction] = []

        for iri in iris:
            activation_date = min(
                statements.loc[(statements["object.id"] == iri)]["timestamp"]
            )
            type = statements.loc[(statements["object.id"] == iri)][
                "context.extensions.http://lrs.learninglocker.net/define/extensions/info.event_name"
            ].unique()

            cohort = statements.loc[(statements["object.id"] == iri)][
                "actor.account.name"
            ].unique()

            score = len(cohort) / dynamic_cohort_size

            active_actions.append(
                ActiveAction(
                    id=iri,
                    activation_date=activation_date,
                    type=type,
                    cohort=cohort,
                    score=score,
                )
            )

        return active_actions


class ScoreIndicator(BaseIndicator):
    """TODO"""

    def __init__(
        self,
        course_id: str,
        student_id: Optional[str] = None,
        until: Optional[datetime] = None,
        sliding_window_size: int = 15,
        active_actions_min: int = 6,
        dynamic_cohort_size: int = 3,
    ):
        """Initialize ScoreIndicator."""
        super().__init__(
            course_id,
            until,
            sliding_window_size,
            active_actions_min,
            dynamic_cohort_size,
        )
        self.student_id = student_id

    def compute(self) -> List[List[StudentScore]]:
        """TODO"""
        # Compute sliding window indicator
        sliding_window = SlidingWindow(self.course_id, until=self.until)
        sliding_window.compute()

        if self.student_id is None:
            cohort_score = []

            for student_id in self.dynamic_cohort:
                cohort_score.append(
                    [
                        StudentScore(
                            student_id=student_id,
                            course_id=self.course_id,
                            score=action.score,
                        )
                        if student_id in action.cohort
                        else StudentScore(
                            student_id=student_id,
                            course_id=self.course_id,
                            score=-action.score,
                        )
                        for action in self.active_actions
                    ]
                )

            return cohort_score
        else:
            return [
                [
                    StudentScore(
                        student_id=self.student_id,
                        course_id=self.course_id,
                        score=action.score,
                    )
                    if self.student_id in action.cohort
                    else StudentScore(
                        student_id=self.student_id,
                        course_id=self.course_id,
                        score=-action.score,
                    )
                    for action in self.active_actions
                ]
            ]
