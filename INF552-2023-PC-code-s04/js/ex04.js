const ctx = {
    w: 820,
    h: 720,
    JITTER_W:50
};

// code for Section 4 (optional)
// data = array of stars with their attributes
// sG = d3 reference to the <g> element
//      for the corresponding spectral type
function densityPlot(data, sG){
    let tEffs = data.map(function (p) { return p.Teff; });
    let tEffScale = ctx.yScale;
    let n = tEffs.length,
        density = kernelDensityEstimator(kernelEpanechnikov(7), tEffScale.ticks(50))(tEffs);
    let maxDensity = d3.max(density, (d) => (d[1]));
    let densityScale = d3.scaleLinear()
        .domain([0, maxDensity])
        .range([0, ctx.JITTER_W * 0.8]);
    // remove entries where y=0 to avoid unnecessarily-long tails
    let i = density.length - 1;
    let lastNonZeroBucket = -1;
    while (i >= 0) {
        // walk array backward, find last entry >0 at index n, keep n+1
        if (density[i][1] > 0) {
            lastNonZeroBucket = i;
            break;
        }
        i--;
    }
    if (lastNonZeroBucket != -1) {
        density = density.splice(0, lastNonZeroBucket + 3);
    }
    // insert a point at 0,0 so that the path fill does not cross the curve
    density.unshift([0, 0]);
    // draw the density curve
    let densityPlotG = sG.append("g").attr("id", "densityPlotG")
    densityPlotG.append("path")
        .datum(density)
        .attr("fill", "#ddd")
        .attr("stroke", "#ccc")
        .attr("stroke-width", 1.5)
        .attr("stroke-linejoin", "round")
        .attr("d", d3.line()
        .curve(d3.curveBasis)
        /* curve point x-coord */
        .x(function(d) { return 80 + densityScale(d[1]); })
        /* curve point y-coord */
        .y(function(d) { return tEffScale(d[0]); }));
    // mirror the density curve
    densityPlotG.append("path")
        .datum(density)
        .attr("fill", "#ddd")
        .attr("stroke", "#ccc")
        .attr("stroke-width", 1.5)
        .attr("stroke-linejoin", "round")
        .attr("d", d3.line()
        .curve(d3.curveBasis)
        /* curve point x-coord */
        .x(function(d) { return 80 - densityScale(d[1]); })
        /* curve point y-coord */
        .y(function(d) { return tEffScale(d[0]); }));
    // put the density plot under the data points
    densityPlotG.lower();
};

function initSVGcanvas(data) {
    //To initialize the y-axis scale and to draw the axis on the left-hand side of the chart, with tick marks every 500K
    let maxMass = d3.max(data, ((d) => parseFloat(d.Teff)));
    let yScale = d3.scaleLinear().domain([0, maxMass])
        .range([ctx.h - 60, 20]);
    ctx.yScale = yScale;
    let yAxis = d3.axisLeft(yScale).ticks(10);
    d3.select("#bkgG").append("g")
        .attr("transform", "translate(70,0)")
        .call(yAxis)
        .selectAll("text")
        .style("text-anchor", "end");

    //y-axis label
    d3.select("#bkgG")
        .append("text")
        .attr("y", 0)
        .attr("x", 0)
        .attr("transform", `rotate(-90) translate(-${(ctx.h - 60) / 2},18)`)
        .classed("axisLb", true)
        .text("Estimated effective Temperature (K)");

    //create 5 different <g> child nodes in <g#rootG> and give them unique Ids
    let spectralTypes = ["O", "B", "A", "F", "G", "K", "M", ""].reverse();
    let spectralTypeG = d3.select("g#rootG")
        .append("g")
        .attr("id", "spectralTypeG")
        .selectAll("g")
        .data(spectralTypes)
        .enter()
        .append("g")
        .attr("id", (d) => (d+'star'))
        .attr("transform", (d, i) => (`translate(${(ctx.w-100) / 8 * (i) + 60},0)`));

    //Add a text label to each <g> element
    spectralTypeG.append("text")
        .attr("y", ctx.h - 20)
        .attr("x", 80)
        .attr("text-anchor", "middle")
        .text((d) => ((d === "") ? '' : d + " Type"));

    //Create a dictionary of data arrays, one for each spectral type
    let dict = {};
    spectralTypes.forEach((d) => { dict[d] = []; });
    for (let i = 0; i < data.length; i++) {
        let d = data[i];
        if (spectralTypes.includes(d.SpType_ELS.trim())) {
            dict[d.SpType_ELS.trim()].push(d);
        }
        else {
            console.log(`Unknown spectral type: ${d.SpType_ELS}`);
        }
    }
    dict[""] = data
    //Plot the data points
    for(let key in dict){
        let sG = d3.select(`g#${key}star`);
        let color = "#f84613";
        if(key === ""){
            color = "black";
        }
        // use d3 transitions to animate the raw data points as if 
        // they were falling from above the chart the position where they belong
        sG.selectAll("circle")
        sG.selectAll("circle")
        .data(dict[key])
        .enter()
        .append("circle")
        .attr("cy", 0)
        .attr("cx", 80 + (Math.random()*ctx.JITTER_W) - (ctx.JITTER_W/2))
        .attr("r", 2)
        .attr("fill", color)
        // transparency
        .attr("fill-opacity", 0.4)
        .attr("stroke", "none")
        .transition()
        .delay((d, i) => (i * 4))
        .attr("cx", (d) => 80 + (Math.random()*ctx.JITTER_W) - (ctx.JITTER_W/2))
        .attr("cy", (d) => yScale(d.Teff))
        .attr("r", 2)
        .attr("fill", color)
        // transparency
        .attr("fill-opacity", 0.4)
        .attr("stroke", "none");
    }
    // put the number of current circule child nodes in each of the <g> element created above
    spectralTypeG.append("text")
        .attr("y", ctx.h - 5)
        .attr("x", 80)
        .attr("text-anchor", "middle")
        .text((d) => (d === "") ? data.length : d3.select(`g#${d}star`).selectAll("circle").size())
        .attr("fill", "grey");

    //Add <title> elements to raw data points showing the star's source in
    //the Gaia DR3 catalogue and estimated temperature when hovering them
    for(let key in dict){
        let sG = d3.select(`g#${key}star`);
        sG.selectAll("circle")
            .append("title")
            .text((d) => (`Gaia DR3 : ${d.Source}\nTemperature: ${d.Teff}K`));
    }
    
    // add a box plot to each of the <g> element created above
    for(let key in dict){
        if(key === ""){
            continue;
        }
        let sG = d3.select(`g#${key}star`);
        sgData = dict[key];
        boxPlot(sG, sgData);
    }

    // add a density plot to each of the <g> element created above
    for(let key in dict){
        if(key === ""){
            continue;
        }
        let sG = d3.select(`g#${key}star`);
        sgData = dict[key];
        densityPlot(sgData, sG);
    }

};

function boxPlot(sG, sgData){
    let summaryStats = getSummaryStatistics(sgData);
    let boxPlotG = sG.append("g").attr("id", "boxPlotG");
    boxPlotG.append("line")
        .attr("x1", 80)
        .attr("y1", ctx.yScale(summaryStats["min"]))
        .attr("x2", 80)
        .attr("y2", ctx.yScale(summaryStats["max"]))
        .attr("stroke", "#676767")
        .attr("stroke-width", 1);
    boxPlotG.append("rect")
        .attr("x", 80 - 35)
        .attr("y", ctx.yScale(summaryStats["q3"]))
        .attr("width", 70)
        .attr("height", ctx.yScale(summaryStats["q1"]) - ctx.yScale(summaryStats["q3"]))
        .attr("fill", "none")
        .attr("stroke", "#676767")
        .attr("stroke-width", 1);
    boxPlotG.append("line")
        .attr("x1", 80 - 35)
        .attr("y1", ctx.yScale(summaryStats["median"]))
        .attr("x2", 80 + 35)
        .attr("y2", ctx.yScale(summaryStats["median"]))
        .attr("stroke", "#676767")
        .attr("stroke-width", 1);
    boxPlotG.append("line")
        .attr("x1", 80 - 10)
        .attr("y1", ctx.yScale(summaryStats["min"]))
        .attr("x2", 80 + 10)
        .attr("y2", ctx.yScale(summaryStats["min"]))
        .attr("stroke", "#676767")
        .attr("stroke-width", 1);
    boxPlotG.append("line")
        .attr("x1", 80 - 10)
        .attr("y1", ctx.yScale(summaryStats["max"]))
        .attr("x2", 80 + 10)
        .attr("y2", ctx.yScale(summaryStats["max"]))
        .attr("stroke", "#676767")
        .attr("stroke-width", 1);
    // Bind individuall
    // put the boxplot under the data points
    boxPlotG.lower();
}

function loadData() {
    d3.csv("data/sample_gaia_DR3.csv").then(function (data) {
        console.log(`Star total count: ${data.length}`);
        let starsWithTeff = data.filter((d) => (parseFloat(d.Teff) > 0));
        starsWithTeff.forEach(
            (d) => { d.Teff = parseFloat(d.Teff); }
        );
        console.log(`Stars with estimated temperature: ${starsWithTeff.length}`);
        initSVGcanvas(data);
    }).catch(function(error){console.log(error)});
};

function createViz(){
    console.log("Using D3 v"+d3.version);
    var svgEl = d3.select("#main").append("svg");
    svgEl.attr("width", ctx.w);
    svgEl.attr("height", ctx.h);
    var rootG = svgEl.append("g").attr("id", "rootG");
    // group for background elements (axes, labels)
    rootG.append("g").attr("id", "bkgG");
    loadData();
};

/*-------------- Summary stats for box plot ------------------------*/
/*-------------- see Instructions/Section 3 ----------------------*/

function getSummaryStatistics(data) {
    return d3.rollup(data, function (d) {
        let q1 = d3.quantile(d.map(function (p) { return p.Teff; }).sort(d3.ascending), .25);
        let median = d3.quantile(d.map(function (p) { return p.Teff; }).sort(d3.ascending), .5);
        let q3 = d3.quantile(d.map(function (p) { return p.Teff; }).sort(d3.ascending), .75);
        let iqr = q3 - q1;
        let min = d3.min(data, (d) => (d.Teff));
        let max = d3.max(data, (d) => (d.Teff));
        return ({ q1: q1, median: median, q3: q3, iqr: iqr, min: min, max: max })
    });
};

/*-------------- kernel density estimator ------------------------*/
/*-------------- see Instructions/Section 4 ----------------------*/

function kernelDensityEstimator(kernel, X) {
  return function(V) {
    return X.map(function(x) {
      return [x, d3.mean(V, function(v) { return kernel(x - v); })];
    });
  };
}

function kernelEpanechnikov(k) {
  return function(v) {
    return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
  };
}
