var createPlot = function(){
    // vegalite plot us-10m.json in albers projection
    vlSpec = {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "width": 500,
        "height": 300,
        "layer": [
          {
            "data": {
              "url": "data/us-10m.json",
              "format": {
                "type": "topojson",
                "feature": "states"
              }
            },
            "projection": {
              "type": "albersUsa"
            },
            "mark": {
              "type": "geoshape",
              "fill": "transparent",
              "stroke": "grey"
            }
          },
          {
            "data": {
              "url": "data/airports.json"
            },
            "projection": {
              "type": "albersUsa"
            },
            "mark": "point",
            "transform": [
              {"filter": "test(/[0-9]/, datum.iata) === false"},
              {
                  "lookup": "state",
                  "from": {
                    "data": {
                      "url": "data/states_tz.csv"
                    },
                    "key": "State",
                    "fields": ["TimeZone"]
                  }
              },
              {"filter": "datum.TimeZone !== null"},
            ],
            "encoding": {
              "longitude": {
                "field": "longitude",
                "type": "quantitative"
              },
              "latitude": {
                "field": "latitude",
                "type": "quantitative"
                },
                "size": {"value": 8},
                "color": {
                    "field": "TimeZone",
                    "type": "nominal",
                    "scale": {"scheme": "tableau10"},
                },
            }
          }
        ]
      }
    vlOpts = {width:1000, height:600, actions:false};
    vegaEmbed("#map", vlSpec, vlOpts); 
};
