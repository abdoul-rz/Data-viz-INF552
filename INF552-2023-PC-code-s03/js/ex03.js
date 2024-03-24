var ctx = {
  sampleSize : '*',
  scaleTypeSP : 'linear',
  MIN_YEAR: 1987,
  DETECTION_METHODS_RVPT: ["Radial Velocity", "Primary Transit"],
  DETECTION_METHODS_ALL4: ["Radial Velocity", "Primary Transit",
                           "Microlensing", "Imaging"],
  DM_COLORS: ['#cab2d6', '#fdbf6f', '#b2df8a', '#fb9a99']
}

var createMassScatterPlot = function(scaleType, sampleSize){
    /* scatterplot: planet mass vs. star mass
       showing year of discovery using color,
       and detection method using shape,
       to be sync'ed with line bar chart below (brushing and linking) */
    // plot only primary transit and radial velocity data vega-lite
    vlSpec = {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "data": { url: "data/exoplanet.eu_catalog.20230927.csv"},
        "mark": {"type": "point", "size": 4},
        // take all of the radial velocity and primary transit data
        // and filter out the rest
        "transform": [
            {"filter": "datum.mass > 0 && datum.star_mass > 0"},
            {"filter": {
                "field": "detection_type",
                "oneOf": ctx.DETECTION_METHODS_RVPT}
            },
        ],
        "encoding": {
            "x": {
                "field": "star_mass",
                "title": "Star Mass M☉",
                "type": "quantitative",
                "scale": {"zero": false, "type": scaleType}
            },
            "y": {
                "field": "mass",
                "title": "Planet Mass",
                "type": "quantitative",
                "scale": {"zero": false, "type": scaleType},
            },
            "color": {
                "field": "discovered",
                "title": "Year of Discovery",
                "timeUnit": "year",
                "type": "temporal",
                "scale": {"scheme": {"name": "blues", "extent": [-1, 2]}},
            },
            "shape": {
                "field": "detection_type",
                "title": "Detection Method",
                "type": "nominal",
                "scale": {"range": ["square", "circle"]},
                "size": {"value": 4}
            },
            "tooltip": [
                {"field": "name", "type": "nominal", "title": "Planet Name"},
                {"field": "discovered", "type": "temporal", "title": "Year of Discovery", "timeUnit": "year"},
            ]
          
        }
    };
    if (sampleSize != '*'){
        vlSpec.transform.push({"sample": sampleSize})
    }
    // see options at https://github.com/vega/vega-embed/blob/master/README.md
    var vlOpts = {width:700, height:700, actions:false};
    vegaEmbed("#massScat", vlSpec, vlOpts);
};

var createMagV2DHisto = function(){
    /* 2D histogram in the bottom-right cell,
       showing V-magnitude distribution (binned)
       for each detection_method */
    vlSpec = 
    {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "data": {"url": "data/exoplanet.eu_catalog.20230927.csv"},
        "transform": [
            {"filter": {
                "field": "detection_type",
                "oneOf": ctx.DETECTION_METHODS_ALL4}
            },
          ],
        "mark": "rect",
        "encoding": {
          "x": {
            "field": "detection_type",
            "type": "nominal"
          },
          "y": {
            "bin": {"maxbins": 45},
            "field": "mag_v",
            "type": "quantitative"
          },
          "color": {
            "aggregate": "count",
            "type": "quantitative",
            "scale": {"scheme": {"name": "greys"}}
        },
        "config": {
            "view": {
              "stroke": "transparent"
            }
          }
        },
    }
      
    vlOpts = {width:300, height:300, actions:false};
    vegaEmbed("#vmagHist", vlSpec, vlOpts);
};

var createDetectionMethodLinePlot = function(){
    // line plot: planet discovery count vs. year
    // vlSpec = {
    //     "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    //     "data": {
    //         //...
    //     },
    //     //...
    // };
    // vlOpts = {width:300, height:300, actions:false};
    // vegaEmbed("#discPlot", vlSpec, vlOpts);
};

var createViz = function(){
    vega.scheme("dmcolors", ctx.DM_COLORS);
    createMassScatterPlot(ctx.scaleTypeSP, '*');
    createMagV2DHisto();
    createDetectionMethodLinePlot();
};

var handleKeyEvent = function(e){
    if (e.keyCode === 13){
        // enter
        e.preventDefault();
        setSample();
    }
};

var updateScatterPlot = function(){
    createMassScatterPlot(ctx.scaleTypeSP, ctx.sampleSize);
};

var setScaleSP = function(){
    ctx.scaleTypeSP = document.querySelector('#scaleSelSP').value;
    updateScatterPlot();
};

var setSample = function(){
    var sampleVal = document.querySelector('#sampleTf').value;
    if (sampleVal.trim()===''){
        return;
    }
    ctx.sampleSize = sampleVal;
    updateScatterPlot();
};
