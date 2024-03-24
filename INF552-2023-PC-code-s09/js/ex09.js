const ctx = {
    ATTRIB: '<a href="https://www.enseignement.polytechnique.fr/informatique/INF552/">X-INF552</a> - <a href="https://www.adsbexchange.com/data-samples/">ADSBX sample data</a>, &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    TRANSITION_DURATION: 1000,
    SC: 4, // half plane icon size
    ADSBX_PREFIX: "1618",
    ADSBX_SUFFIX: "Z",
    ALT_FLOOR: 32000,
    filteredFlights: [],
    planeUpdater: null,
    LFmap: null,
    selectedMark: null,
    width: 400,
    height: 480,
};

// Data fron 20231101 obtained from https://samples.adsbexchange.com/readsb-hist/2023/11/01
// iterate over to simulate real-time queries every 5s
// 161800Z.json
// 1618..Z.json
// 161855Z.json
const LOCAL_DUMP_TIME_INDICES = [...Array(12).keys()].map(i => i * 5);
let LOCAL_DUMP_TIME_INC = 1;

function createViz() {
    console.log("Using D3 v" + d3.version);
    createMap();
    loadFlights();
};

function getPlaneTransform(d) {
    let point = ctx.LFmap.latLngToLayerPoint([d.lat, d.lon]);
    let x = point.x;
    let y = point.y;
    if (d.bearing != null && d.bearing != 0) {
        let t = `translate(${x},${y}) rotate(${d.bearing} ${ctx.SC} ${ctx.SC})`;
        return t;
    }
    else {
        let t = `translate(${x},${y})`;
        return t;
    }
};

function drawPlanes(animate) {
    //XXX:TBW
    // bind ctx.filteredFlights items to <image> elements (Section 2.1)
    let svgEl = d3.select("#LFmap").select("svg");
    let planes = svgEl.select("#planes").selectAll("image").data(ctx.filteredFlights, d => d.id);
    planes.exit().remove();
    planes.enter()
        .append("image")
        .attr("id", d => `p-${d.id}`)
        .attr("xlink:href", "plane_icon.png")
        .attr("width", 2 * ctx.SC)
        .attr("height", 2 * ctx.SC)
        .attr("transform", getPlaneTransform)
        .merge(planes)
        .transition()
        .duration(animate ? ctx.TRANSITION_DURATION : 0)
        .attr("transform", getPlaneTransform);
    d3.select("img#inProg").style("visibility", "hidden");
};

/* data fetching and transforming */
function createMap() {
    // https://leafletjs.com/examples/overlays/example-svg.html
    ctx.LFmap = L.map('LFmap');
    L.DomUtil.addClass(ctx.LFmap._container, 'crosshair-cursor-enabled');
    const tiles = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: ctx.ATTRIB
    }).addTo(ctx.LFmap);
    ctx.LFmap.setView([0, 0], 2);
    ctx.LFmap.on('click', function (e) {
        showDetails(getClosestPlane(e.latlng));
    });
    L.svg().addTo(ctx.LFmap);
    let svgEl = d3.select("#LFmap").select("svg");
    svgEl.select("g")
        .attr("id", "planes");
    ctx.LFmap.on('zoom', function () { drawPlanes(false); });

    d3.select("#inTheAir").append("svg")
        .attr("id", "rectGraph")
        .attr("width", ctx.width)
        .attr("height", ctx.height - 280)
        .attr("transform", "translate(27,0)");

    d3.select("#alt").append("svg")
        .attr("id", "legend")
        .attr("width", ctx.width)
        .attr("height", ctx.height)
        .attr("transform", "translate(27,100)");
};

function loadFlights() {
    let tMin = "00";
    loadPlanesFromLocalDump(`data/${ctx.ADSBX_PREFIX}${tMin}${ctx.ADSBX_SUFFIX}.json`, false);
    startPlaneUpdater();

}

function loadPlanesFromLocalDump(dumpPath, animate){
    // when resetting time, do not animate plane position
    d3.select("img#inProg").style("visibility", "visible");
    console.log(`Querying local ADSBX dump ${dumpPath}...`);
    d3.json(dumpPath).then(
        function (data) {
            //XXX: TBW
            // prepare the data structure (Section 1)
            // filter out planes with altitude > ALT_FLOOR (Section 2.2)
            let newData = data.aircraft.filter(d => d.alt_baro >= ctx.ALT_FLOOR && d.lat != null && d.lon != null);
            ctx.filteredFlights = newData.map(d => {
                return {
                    id: d.hex,
                    callsign: d.flight,
                    lat: d.lat,
                    lon: d.lon,
                    bearing: d.track,
                    alt: d.alt_baro,
                    ...d
                };
            });
            drawPlanes(animate);
            drawRect(data.aircraft);
            drawGraph();
        }
    ).catch(function (err) { console.log(err); });
};

function drawRect(data) {
  // draw a percentage bar chart of the number of planes in the air vs. on the ground
    let svgEl = d3.select("svg#rectGraph");
    let planes = data;
    let inTheAir = planes.filter(d => d.alt_baro >= ctx.ALT_FLOOR);
    let onTheGround = planes.filter(d => d.alt_baro < ctx.ALT_FLOOR);
    let total = planes.length;
    let air = inTheAir.length;
    let ground = onTheGround.length;
    let airPct = air;
    let groundPct = ground;
    let xScale = d3.scaleLinear()
        .domain([0, total])
        .range([0, ctx.width - 80]);
    let xAxis = d3.axisBottom(xScale);
    let tickValues = [];
    for (let i = 0; i <= 1; i += 0.25) {
        tickValues.push(i);
    }
    
    // y two ticks 'In the air' and 'On the ground' in 90 degree rotation
    let yScale = d3.scaleBand()
        .domain(["In the air", "On ground"])
        .range([0, 140])
        //rotate the text;
        .paddingInner(0.1);

    let yAxis = d3.axisLeft(yScale);
    svgEl.selectAll("g").remove();
    svgEl.selectAll("text").remove();
    svgEl.append("g")
        .attr("transform", "translate(60, 15)")
        .call(yAxis);
    
    svgEl.append("g")
        .attr("transform", `translate(60, 160)`)
        .call(xAxis);
    svgEl.append("text")
        .attr("transform", `translate(${ctx.width / 2 - 10}, ${ctx.height - 285})`)
        .text("Number of planes");
    
    svgEl.selectAll("rect").remove();
    svgEl.selectAll("rect")
        .data([airPct, groundPct])
        .enter()
        .append("rect")
        .attr("x", 62)
        .attr("y", (d, i) => 26 +  i * 70)
        .attr("width", d => xScale(d))
        .attr("height", 50)
        .attr("fill", (d, i) => i == 0 ? "steelblue" : "orange")
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .attr("opacity", 0.5);
    
}



function showDetails(plane) {
    //XXX:TBW
    // Show callsign in <div#info> when hovering a plane on the map by writing the contents of function
    // showDetails(...), that gets called whenever users click on the map (the closest plane gets selected).
    let info = d3.select("#info");
    info.html(`<b>${plane.callsign}</b>`);
    // info.append("br");
    // info.append("span").text(`Altitude: ${plane.alt} ft`);
};

function drawGraph() {
    // Select the existing SVG or create a new one
    // bar chart of the number of planes per altitude
    let svgEl = d3.select("svg#legend");
    let planes = ctx.filteredFlights;
    let altitudes = planes.map(d => d.alt);
    let max = d3.max(altitudes);
    let min = d3.min(altitudes);
    let bins = d3.bin()(altitudes);
    let xScale = d3.scaleLinear()
        .domain([min, max])
        .range([0, ctx.width - 80]);
    // show only 4 ticks
    let tickValues = [];
    let tickStep = Math.floor((max - min) / 4);
    for (let i = min; i <= max; i += tickStep) {
        tickValues.push(i);
    }
    let yScale = d3.scaleLinear()
        .domain([0, d3.max(bins, d => d.length)])
        .range([ctx.height - 60, 10]);
    let xAxis = d3.axisBottom(xScale)
        .tickValues(tickValues);
    let yAxis = d3.axisLeft(yScale);
    svgEl.selectAll("g").remove();
    svgEl.selectAll("text").remove();
    svgEl.append("g")
        .attr("transform", "translate(50,10)")
        .call(yAxis);
    svgEl.append("g")
        .attr("transform", `translate(50,${ctx.height - 50})`)
        .call(xAxis);
    svgEl.append("text")
        .attr("transform", `translate(${ctx.width / 2}, ${ctx.height - 10})`)
        .text("Altitude (ft)");
    svgEl.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 20)
        .attr("x", 0 - (ctx.height / 2))
        .text("Number of planes");
    svgEl.selectAll("rect").remove();
    svgEl.selectAll("rect")
        .data(bins)
        .enter()
        .append("rect")
        .attr("x", d => xScale(d.x0) + 50)
        .attr("y", d => yScale(d.length) + 10)
        .attr("width", d => xScale(d.x1) - xScale(d.x0))
        .attr("height", d => ctx.height - 60 - yScale(d.length))
        .attr("fill", "steelblue")
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .attr("opacity", 0.5);
}


function getClosestPlane(cursorCoords) {
    let res = ctx.filteredFlights[0];
    let smallestDist = Math.pow(res.lon - cursorCoords.lng, 2) + Math.pow(res.lat - cursorCoords.lat, 2);
    for (let i = 1; i < ctx.filteredFlights.length; i++) {
        let dist = Math.pow(ctx.filteredFlights[i].lon - cursorCoords.lng, 2) + Math.pow(ctx.filteredFlights[i].lat - cursorCoords.lat, 2);
        if (dist < smallestDist) {
            res = ctx.filteredFlights[i];
            smallestDist = dist;
        }
    }
    let newSelection = d3.select(`#p-${res.callsign}`);
    if (ctx.selectedMark == null) {
        ctx.selectedMark = newSelection;
    }
    else {
        ctx.selectedMark.style("filter", "none");
        ctx.selectedMark.style("outline", "none");
        ctx.selectedMark = newSelection;
    }
    ctx.selectedMark.style("filter", "drop-shadow(0px 0px 1px rgb(128,0,128))");
    ctx.selectedMark.style("outline", "1px solid rgb(128,0,128,.5)");
    return res;
}

function toggleUpdate() {
    // Make the on/off button actually toggle auto-update every 5 seconds, using JavaScript’s setInterval()
    // and clearInterval() methods (Section 2.3).
    
    // get the value of the button

    // if the value is "On", then stop the planeUpdater and change the value to "Off"
    // if the value is "Off", then start the planeUpdater and change the value to "On"
    if (ctx.planeUpdater != null) {
        //XXX:TBW
        // Section 2.3
        clearInterval(ctx.planeUpdater);
        d3.select("#updateBt").attr("value", "Off");
        ctx.planeUpdater = null;
        
    }
    else {
        //XXX:TBW
        // Section 2.3
        startPlaneUpdater();
        d3.select("#updateBt").attr("value", "On");
    }
};

function startPlaneUpdater() {
    ctx.planeUpdater = setInterval(
        function () {
            let tMin = String(LOCAL_DUMP_TIME_INDICES[LOCAL_DUMP_TIME_INC]).padStart(2, '0');
            loadPlanesFromLocalDump(`data/${ctx.ADSBX_PREFIX}${tMin}${ctx.ADSBX_SUFFIX}.json`, tMin != "00");
            if (LOCAL_DUMP_TIME_INC == LOCAL_DUMP_TIME_INDICES.length - 1) {
                LOCAL_DUMP_TIME_INC = 0;
            }
            else {
                LOCAL_DUMP_TIME_INC++;
            }
        },
        5000);
};
