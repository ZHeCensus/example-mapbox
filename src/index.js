import React, { useRef, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import mapboxgl from "mapbox-gl";
import census from "citysdk";
import * as d3 from "d3-scale";
import "mapbox-gl/dist/mapbox-gl.css";
import "./styles.css";

mapboxgl.accessToken =
  "pk.eyJ1IjoiemhpayIsImEiOiJjaW1pbGFpdHQwMGNidnBrZzU5MjF5MTJiIn0.N-EURex2qvfEiBsm-W9j7w";

function App() {
  const [viewport, setViewport] = useState({
    lng: -84,
    lat: 42,
    zoom: 1.5
  });

  const [style, setStyle] = useState({
    version: 8,
    name: "blank",
    sources: {
      "mapbox-streets": {
        type: "vector",
        url: "mapbox://mapbox.mapbox-streets-v6"
      },
      states: {
        type: "vector",
        tiles: [
          "https://gis-server.data.census.gov/arcgis/rest/services/Hosted/VT_2017_040_00_PY_D1/VectorTileServer/tile/{z}/{y}/{x}.pbf"
        ]
      }
    },
    layers: [
      {
        id: "water",
        source: "mapbox-streets",
        "source-layer": "water",
        type: "fill",
        paint: {
          "fill-color": "#00ffff"
        }
      }
    ]
  });

  let map = null;

  const mapContainer = useRef();

  //init map
  //https://blog.mapbox.com/mapbox-gl-js-react-764da6cc074a
  useEffect(() => {
    const { lng, lat, zoom } = viewport;

    map = new mapboxgl.Map({
      container: mapContainer.current.id,
      style,
      center: [lng, lat],
      zoom
    });

    map.on("move", () => {
      const { lng, lat } = map.getCenter();

      setViewport({
        lng: lng.toFixed(4),
        lat: lat.toFixed(4),
        zoom: map.getZoom().toFixed(2)
      });
    });

    map.on("mousemove", e => {
      const features = map.queryRenderedFeatures(e.point);

      //console.log(features.map(feature => feature.properties));
    });
  }, []);

  // update map on style change
  useEffect(() => {
    if (map) {
      map.setStyle(style);
    }
  }, [style]);

  useEffect(() => {
    map.on("load", () => {
      census(
        {
          vintage: 2015,
          geoHierarchy: {
            state: "*"
          },
          sourcePath: ["acs", "acs5"],
          values: ["B00001_001E"]
        },
        (err, res) => {
          const expression = ["match", ["get", "GEOID"]];
          const max = res.reduce((total, feature) => {
            return feature["B00001_001E"] > total
              ? feature["B00001_001E"]
              : total;
          }, 0);
          res.forEach(row => {
            const green = (row["B00001_001E"] / max) * 255;
            const color = "rgba(" + 0 + ", " + green + ", " + 0 + ", 1)";
            expression.push(row["state"], color);
          });

          console.log(expression);
          expression.push("rgba(0,0,0,0)");

          map.addLayer({
            id: "state-polygon",
            source: "states",
            "source-layer": "State",
            type: "fill",
            paint: {
              "fill-color": expression
            },
            maxzoom: 17
          });
        }
      );
    });
  }, []);

  return <div id="map" ref={mapContainer} />;
}

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);
