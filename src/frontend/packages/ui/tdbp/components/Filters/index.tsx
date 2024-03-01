import React from "react";
import { DatePicker, Button } from "@openfun/cunningham-react";
import dayjs from "dayjs";
import useFilters from "../../hooks/useFilters";
import { queryClient } from "../../../libs/react-query";
import { formatDate, getDefaultDate } from "../../utils";

export const Filters: React.FC = () => {
  const { until, setUntil } = useFilters();

  const handleDateChange = (value: string | null): void => {
    if (value) {
      setUntil(formatDate(value));
    } else {
      const defaultDate = getDefaultDate();
      setUntil(defaultDate);
    }
  };

  return (
    <div className="c__filters">
      <DatePicker
        className="c__filters__date-picker"
        label="Date de fin"
        maxValue={dayjs().endOf("day").format()}
        value={until}
        onChange={(value) => handleDateChange(value)}
      />
      <Button
        className="c__filters__refresh"
        aria-label="Refresh dashboard"
        color="tertiary"
        icon={<span className="material-icons">cached</span>}
        onClick={() => queryClient.refetchQueries({ type: "active" })}
      />
    </div>
  );
};
