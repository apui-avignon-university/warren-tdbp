import React, { useMemo } from "react";

import ReactECharts from "echarts-for-react";
import cloneDeep from "lodash.clonedeep";
import dayjs from "dayjs";
import { useSlidingWindow, Action } from "../../api/getSlidingWindow";
import useFilters from "../../hooks/useFilters";
import { Card } from "../../../components/Card";
import { useScore } from "../../api/getScore";

const baseOption = {
  tooltip: {
    trigger: "axis",
    axisPointer: {
      // Use axis to trigger tooltip
      type: "shadow", // 'shadow' as default; can also be 'line' or 'shadow'
    },
  },
  legend: {},
  grid: {
    left: "3%",
    right: "4%",
    bottom: "3%",
    containLabel: true,
  },
  xAxis: {
    type: "value",
    min: 0,
  },
  yAxis: {
    type: "category",
    data: [],
  },
  series: [],
};
export const StudentsComparison: React.FC = () => {
  const { until } = useFilters();

  const courseId = "wip";

  const { slidingWindow } = useSlidingWindow({ courseId, until });
  const { data } = useScore({ courseId, until });

  const actions = useMemo(() => {
    if (!slidingWindow || !slidingWindow?.active_actions) {
      return [];
    }
    return slidingWindow?.active_actions;
  });

  const parseSeries = (data, category: string): Array<string> => {
    const numberStudents = data.length;

    const action_ids = actions
      .filter((action) => action.type === category)
      .map((action) => action.iri);

    const studentsScore = [];

    for (let i = 0; i < numberStudents; i++) {
      studentsScore.push(
        data[i]
          .filter((item) => action_ids.includes(item.action_id))
          .map((action) => action.value)
          .reduce((a, b) => a + b, 0),
      );
    }

    return {
      name: category === "resource" ? "Score ressource" : "Score activité",
      type: "bar",
      stack: "total",
      label: {
        show: true,
      },
      emphasis: {
        focus: "series",
      },
      data: studentsScore,
    };
  };

  const formattedOption = useMemo(() => {
    if (!slidingWindow) {
      return baseOption;
    }

    const students = slidingWindow.dynamic_cohort;

    const newOption = cloneDeep(baseOption);

    newOption.yAxis.data = students.sort().reverse();

    if (data) {
      newOption.series = [
        parseSeries(data, "resource"),
        parseSeries(data, "activity"),
      ];
    }

    return newOption;
  }, [slidingWindow, data]);

  return (
    <Card className="c__activities">
      <div className="c__activities__title">
        Scores cumulés pour toutes les actions
      </div>
      <ReactECharts
        option={formattedOption}
        notMerge={true}
        style={{ height: 500, width: "100%" }}
      />
    </Card>
  );
};
