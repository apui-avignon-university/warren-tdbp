import React, { useMemo } from "react";

import ReactECharts from "echarts-for-react";
import cloneDeep from "lodash.clonedeep";
import dayjs from "dayjs";
import { useSlidingWindow, Action, Ressources } from "../../api/getSlidingWindow";
import useFilters from "../../hooks/useFilters";
import { Card } from "../../../components/Card";

// Define a generic type for enum
export function isInEnum<T>(value: string, enumObject: T): boolean {
  // Check if the enum object is valid
  if (typeof enumObject !== 'object' || enumObject === null) {
      throw new Error('Invalid enum object');
  }

  // Iterate over enum keys and check if the value matches
  for (const enumMember in enumObject) {
      const enumValue = (enumObject as any)[enumMember];
      if (typeof enumValue === 'string' && enumValue === value) {
          return true;
      }
  }
  return false;
}

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

  const resources = useMemo(() => {
    if (!slidingWindow?.active_actions) {
      return [];
    }

    const activeActions = slidingWindow?.active_actions;

    if (!activeActions.length) {
      return [];
    }

    const sortedResources = activeActions
      ?.filter((action) => isInEnum(action.module_type, Ressources))
      .sort((a, b) => a.activation_rate - b.activation_rate);

    return sortedResources;
  }, [slidingWindow]);

  const parseYAxis = (actions: Array<Action>): Array<string> =>
    actions.map((action) => action.title) || [];

  const parseSeries = (actions: Array<Action>): Array<string> => ({
    name: "Taux de consultation",
    type: "bar",
    stack: "total",
    label: {
      show: true,
      position: "insideLeft",
      formatter: (d) =>
        dayjs(actions[d.dataIndex].activation_date).format("DD/MM"),
    },
    emphasis: {
      focus: "series",
    },
    data: actions.map((action) => action.activation_rate) || [],
  });

  const formattedOption = useMemo(() => {
    const newOption = cloneDeep(baseOption);
    newOption.yAxis.data = parseYAxis(resources);
    newOption.series = parseSeries(resources);
    return newOption;
  }, [resources]);

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
