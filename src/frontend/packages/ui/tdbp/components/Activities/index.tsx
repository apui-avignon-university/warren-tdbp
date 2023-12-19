import React, { useMemo } from "react";

import ReactECharts from "echarts-for-react";
import cloneDeep from "lodash.clonedeep";
import dayjs from "dayjs";
import { useSlidingWindow, Action } from "../../api/getSlidingWindow";
import useFilters from "../../hooks/useFilters";
import { Card } from "../../../components/Card";

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
    max: 100,
  },
  yAxis: {
    type: "category",
    data: [],
  },
  series: [],
};
export const Activites: React.FC = () => {
  const { until } = useFilters();

  const courseId = "wip";

  const { slidingWindow } = useSlidingWindow({ courseId, until });

  const parseYAxis = (actions: Array<Action>): Array<string> =>
    actions.map((action) => action.title.en) || [];

  const parseSeries = (actions: Array<Action>): Array<string> => ({
    name: "Taux de consultation",
    type: "bar",
    stack: "total",
    label: {
      show: true,
      position: "insideLeft",
      formatter: (d) =>
        dayjs(actions[d.dataIndex].activation_date).format("DD MMMM"),
    },
    emphasis: {
      focus: "series",
    },
    data: actions.map((action) => action.activation_rate) || [],
  });

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

    const sortedActiveActions = activeActions.sort(
      (a, b) => a.activation_rate - b.activation_rate,
    );

    newOption.yAxis.data = parseYAxis(sortedActiveActions);
    newOption.series = parseSeries(sortedActiveActions);
    return newOption;
  }, [slidingWindow]);

  return (
    <Card className="c__activities">
      <div className="c__activities__title">
        Taux de consultation des ressources
      </div>
      <ReactECharts
        option={formattedOption}
        notMerge={true}
        style={{ height: 500, width: "100%" }}
      />
    </Card>
  );
};
