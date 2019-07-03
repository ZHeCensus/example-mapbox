function extentSearch(extent) {
  return fetch(
    `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2010/MapServer/8/query?geometry=${extent}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&returnGeometry=false&f=pjson`
  ).then(r => r.json());
}

export default extentSearch;
