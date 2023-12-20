import React from "react";
import { Filters } from "../../components/Filters";
import { Flexgrid } from "../../../components/Layout/Flexgrid";
import { Window } from "../../components/Window";
import { Activites } from "../../components/Activities";
import { Radar } from "../../components/Radar";
import { StudentsComparison } from "../../components/StudentsComparison";

/**
 * A React component responsible for rendering a dashboard overview of video statistics.
 *
 * This component combines the Filters component for selecting date ranges and videos, with the DailyViews component
 * to display daily video statistics. It serves as a dashboard overview of all videos' statistical data.
 *
 * @returns {JSX.Element} The JSX for the videos statistics overview dashboard.
 */
export default () => {
  return (
    <div className="c__overview">
      <Filters />
      <Window />
      <Flexgrid>
        <Activites />
        <StudentsComparison />
        <Radar />
      </Flexgrid>
    </div>
  );
};
