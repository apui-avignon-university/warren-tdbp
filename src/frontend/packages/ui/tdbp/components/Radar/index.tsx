import React, { useMemo, useState } from "react";

import ReactECharts from "echarts-for-react";
import cloneDeep from "lodash.clonedeep";
import { Select } from "@openfun/cunningham-react";
import { useSlidingWindow, Action } from "../../api/getSlidingWindow";
import useFilters from "../../hooks/useFilters";
import { Card } from "../../../components/Card";
import { Score, useScore } from "../../api/getScore";

const baseOption = {
  legend: {
    data: ["Moyenne cohorte", "Étudiant sélectionné"],
  },
  radar: {
    // shape: 'circle',
    indicator: [],
  },
  series: [],
};
export const Radar: React.FC = () => {
  const { until } = useFilters();

  const courseId = "wip";

  const { slidingWindow } = useSlidingWindow({ courseId, until });
  const { data } = useScore({ courseId, until });

  const [selectedStudent, setSelectedStudent] = useState(null);

  const parseIndicators = (actions: Array<Action>): Array<string> =>
    actions.map((action) => ({ name: action.title.en, max: 100 }));

  const parseSeries = (scoresCohort: Array<Array<Score>>, selectedStudent) => {
    const cohortMeanScores = [];
    const selectedStudentScores = [];

    if (!scoresCohort.length) {
      return [];
    }

    const numberStudents = scoresCohort.length;
    const numberActions = scoresCohort[0].length;

    for (let i = 0; i < numberActions; i++) {
      let sum = 0;
      for (let j = 0; j < numberStudents; j++) {
        sum += scoresCohort[j][i].value;
        if (scoresCohort[j][i].student_id === selectedStudent) {
          selectedStudentScores.push(scoresCohort[j][i].value);
        }
      }
      const mean = Math.floor(sum / numberStudents);
      cohortMeanScores.push(mean);
    }

    const series = [
      {
        name: "Moyenne cohorte",
        type: "radar",
        data: [{ value: cohortMeanScores, name: "moyenne cohorte" }],
      },
    ];

    if (selectedStudentScores.length) {
      series.push({
        name: "Étudiant sélectionné",
        type: "radar",
        data: [{ value: selectedStudentScores, name: selectedStudent }],
      });
    }

    return series;
  };

  const studentOptions = useMemo(() => {
    if (!slidingWindow?.dynamic_cohort) {
      return [];
    }
    return slidingWindow.dynamic_cohort.map((student) => ({
      value: student,
      label: student,
    }));
  }, [slidingWindow]);

  const formattedOption = useMemo(() => {
    if (!slidingWindow?.active_actions) {
      return baseOption;
    }

    const activeActions = slidingWindow.active_actions;

    if (!activeActions.length) {
      return baseOption;
    }
    const newOption = cloneDeep(baseOption);
    // We assume all requests share the same xAxis.

    newOption.radar.indicator = parseIndicators(activeActions);
    newOption.series = parseSeries(data || [], selectedStudent);
    return newOption;
  }, [slidingWindow, data, selectedStudent]);

  return (
    <Card className="c__radar">
      <div className="c__radar__title">Tableau de bord étudiant</div>
      <Select
        label="Étudiant"
        disabled={!slidingWindow?.dynamic_cohort}
        options={studentOptions}
        onChange={(e) => setSelectedStudent(e.target.value)}
      />
      <ReactECharts
        option={formattedOption}
        notMerge={true}
        style={{ height: 500, width: "100%" }}
      />
    </Card>
  );
};
