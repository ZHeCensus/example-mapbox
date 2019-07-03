import React, { useRef, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import mapboxgl from "mapbox-gl";

//components
import BarChart from "./components/barChart";
import Table from "./components/table";

//helpers
import extentSearch from "./helpers/extentSearch";
import censusPromise from "./helpers/censusPromise";

//styles
import "mapbox-gl/dist/mapbox-gl.css";
import "./styles.css";

mapboxgl.accessToken =
  "pk.eyJ1IjoiemhpayIsImEiOiJjaW1pbGFpdHQwMGNidnBrZzU5MjF5MTJiIn0.N-EURex2qvfEiBsm-W9j7w";

const CENSUS_API_KEY = "3c04140849164b373c8b1da7d7cc8123ef71b7ab"; //replace with your own

function App() {
  const [viewport, setViewport] = useState({
    lng: -73.909126,
    lat: 40.709858,
    extent: [],
    zoom: 10
  });

  const [currentId, setCurrentId] = useState("11385");

  const [extentChanged, setExtentChange] = useState(false);

  const [chartData, setChartData] = useState([]);

  const [style, setStyle] = useState({
    version: 8,
    name: "blank",
    sources: {
      "mapbox-streets": {
        type: "vector",
        url: "mapbox://mapbox.mapbox-streets-v8"
      },
      esri: {
        type: "vector",
        tiles: [
          "https://gis-server.data.census.gov/arcgis/rest/services/Hosted/VT_2017_860_00_PY_D1/VectorTileServer//tile/{z}/{y}/{x}.pbf" //zcta
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

  const mapContainer = useRef();
  let map = null;

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
      const { _sw, _ne } = map.getBounds();
      const extent = [_sw.lng, _sw.lat, _ne.lng, _ne.lat];
      //check for extent change - probably don't need to check
      if (viewport.extent.join(",") !== extent.join(",")) setExtentChange(true);

      setViewport({
        lng: lng.toFixed(4),
        lat: lat.toFixed(4),
        extent,
        zoom: map.getZoom().toFixed(2)
      });
    });

    map.on("mousemove", e => {
      const features = map.queryRenderedFeatures(e.point);

      //console.log(features.map(feature => feature.properties.BASENAME));
    });
  }, []);

  // update map on style change
  useEffect(() => {
    if (map) {
      map.setStyle(style);
    }
  }, [style]);

  //init extent search for charts - todo pull parmas from url: look at Logan's example
  useEffect(() => {
    const extent =
      "-73.96676264454007,40.66256118034471,-73.76698208851356,40.74780433961331";

    updateVis(currentId, extent);
  }, [currentId]);

  async function updateVis(currentId, extent) {
    const extentZCTAs = await extentSearch(extent).then(res =>
      res.features.map(feature => parseInt(feature.attributes.BASENAME, 10))
    );

    const columns = ["B19001_001E", "B19001_001M"]; // HOUSEHOLD INCOME IN THE PAST 12 MONTHS
    const geoType = "zip code tabulation area";

    const dataQuery = {
      vintage: 2017,
      geoHierarchy: {},
      sourcePath: ["acs", "acs5"],
      values: columns,
      statsKey: CENSUS_API_KEY
    };

    dataQuery.geoHierarchy[geoType] = [
      ...new Set([...extentZCTAs, currentId])
    ].join(","); //add currentZCTA if it isn't there already

    const data = await censusPromise(dataQuery).then(res =>
      res
        .map(row => {
          const estimate = row[columns[0]]; // estimate
          const error = row[columns[1]]; // margin of error
          const id = row[geoType.replace(/\s+/g, "-")];
          return { estimate, error, id };
        })
        .sort((a, b) => a.id > b.id)
    );

    //update state with data
    setChartData(data);

    //add map layer
    const expression = ["match", ["get", "GEOID"]];
    const max = data.reduce((total, feature) => {
      return feature["estimate"] > total ? feature["estimate"] : total;
    }, 0);
    data.forEach(row => {
      const red = (row["estimate"] / max) * 255;
      const color = "rgba(" + red + ", " + 0 + ", " + 0 + ", 1)";
      expression.push(row["id"], color);
    });

    expression.push("rgba(0,0,0,0)");

    map.addLayer({
      id: "polygon",
      source: "esri",
      "source-layer": "ZCTA5",
      type: "fill",
      paint: {
        "fill-color": expression
      },
      maxzoom: 17
    });
  }

  return (
    <div className="panel">
      <div className="panel-left">
        <Table />
      </div>
      <div className="panel-right">
        {extentChanged ? (
          <div id="extent">
            <button>Update Search Extent</button>
          </div>
        ) : null}
        <div id="map" ref={mapContainer} />
        <BarChart data={chartData} currentId={currentId} />
      </div>
    </div>
  );
}

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);
