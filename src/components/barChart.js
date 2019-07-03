import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

export default function BarChart({ data, currentId }) {
  const refElement = useRef(null);

  useEffect(() => {
    if (refElement.current && data.length && currentId) {
      const margin = { top: 20, right: 20, bottom: 20, left: 40 },
        width = 500 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

      const y = d3
        .scaleBand()
        .range([height, 0])
        .padding(0.1);

      const x = d3.scaleLinear().range([0, width]);

      const chart = d3
        .select(refElement.current)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      x.domain([0, d3.max(data, d => d.estimate)]);
      y.domain(data.map(d => d.id));

      chart
        .selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("width", d => x(d.estimate))
        .attr("y", d => y(d.id))
        .attr("height", y.bandwidth())
        .attr("fill", d => (d.id === currentId ? "#FF6666" : "#688087"));

      chart
        .append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));

      chart.append("g").call(d3.axisLeft(y));
    }
  });

  return <div className="chart" ref={refElement} />;
}
