const ctx = {
    SVG_W: 1024,
    SVG_H: 1024,
    YEAR: "2018",
};

function loadData(svgEl) {
    //fetch all the data
    let promises = [
        d3.json("data/gra.geojson"),
        d3.json("data/nutsrg.geojson"),
        d3.json("data/nutsbn.geojson"),
        d3.json("data/cntbn.geojson"),
        d3.json("data/cntrg.geojson"),
        d3.csv("data/pop_density_nuts3.csv"),
    ];

    //parse the data
    Promise.all(promises).then(function (values) {
        let graticule = values[0];
        let nutsrg = values[1];
        let nutsbn = values[2];
        let cntbn = values[3];
        let cntrg = values[4];
        let density_data = values[5];
        //For each feature in nutsrg, retrieve the population density OBS_VALUE from pop_density_nuts3.csv
        nutsrg.features.forEach(function (d) {
            let nuts_id = d.properties.id;
            let pop_density = density_data.find(function (e) {
                return e.geo === nuts_id && e.TIME_PERIOD === ctx.YEAR;
            });
            d.properties.density = parseFloat(pop_density.OBS_VALUE);
        });
        // draw the map
        geoGraph(svgEl, graticule, nutsrg, nutsbn, cntbn, cntrg, density_data);
    });
};

function geoGraph(svgEl, graticule, nutsrg, nutsbn, cntbn, cntrg, density_data) {
    // projection
    ctx.proj = d3.geoIdentity()
                .reflectY(true)
                .fitSize([ctx.SVG_H, ctx.SVG_H], graticule);
    // d3 geo path generator
    geo_path = d3.geoPath().projection(ctx.proj);
    console.log(nutsrg);
    // log scale for density
    densities = nutsrg.features.map(function (d) { return d.properties.density});
    min_density = d3.min(densities);
    max_density = d3.max(densities);
    console.log("min value : " + min_density, " max value : " + max_density);
    log_scale = d3.scaleLog().domain([min_density, max_density]);

    // viridis interpolation for density
    color_scale = d3.scaleSequential(d3.interpolateViridis);
    // draw the areas from features of nutsrg.geojson
    svgEl.append('g')
        .attr("class", "nutsArea")
        .selectAll("path")
        .data(nutsrg.features)
        .enter()
        .append("path")
        .attr("d", geo_path)
        .attr("stroke", "#DDD")
        .attr("fill", function (d) { return color_scale(log_scale(d.properties.density))});

    // draw the areas from features of nutsbn.geojson
    svgEl.append('g')
        .attr("class", "nutsBorder")
        .selectAll("path")
        .data(nutsbn.features)
        .enter()
        .append("path")
        .attr("d", geo_path);
    
    // draw areas and borders from cntrg.geojson and cntbn.geojson.
    svgEl.append('g')
        .attr("class", "countryArea")
        .selectAll("path")
        .data(cntrg.features)
        .enter()
        .append("path")
        .attr("d", geo_path);
    
    svgEl.append('g')
        .attr("class", "countryBorder")
        .selectAll("path")
        .data(cntbn.features)
        .enter()
        .append("path")
        .attr("d", geo_path);
}


function createViz() {
    console.log("Using D3 v" + d3.version);
    let svgEl = d3.select("#main").append("svg");
    svgEl.attr("width", ctx.SVG_W);
    svgEl.attr("height", ctx.SVG_H);
    loadData(svgEl);
};

// NUTS data as JSON from https://github.com/eurostat/Nuts2json (translated from topojson to geojson)
// density data from https://data.europa.eu/data/datasets/gngfvpqmfu5n6akvxqkpw?locale=en
