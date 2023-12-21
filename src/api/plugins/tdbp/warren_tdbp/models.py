"""Warren TdBP indicator models ."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel
from warren.filters import DatetimeRange


class ActiveAction(BaseModel):
    """Model for a computed active action.

    Attributes:
        iri (str): action identifier.
        type (str):
        activation_date (str): day when the action has been activated.
        cohort (list): IDs of student who made this action in the frame of the sliding window.
        activation_rate (float): Ratio of the student compared to the dynamic cohort who made this action
    """

    iri: str
    type: str
    activation_date: Optional[datetime] = None
    cohort: List[str]
    activation_rate: float


class SlidingWindow(BaseModel):
    """Model for sliding window indicator.

    Attributes:
        window (DatetimeRange): date range in which active actions have been made.
        active_actions (list): active actions within the floating window.
        dynamic_cohort (list): IDs of student who made actions in the sliding window.
    """

    window: DatetimeRange
    active_actions: List[ActiveAction]
    dynamic_cohort: List[str]


class StudentScore(BaseModel):
    """Model for the computed student score to an active action."""

    student_id: str
    action_id: str
    score: float
