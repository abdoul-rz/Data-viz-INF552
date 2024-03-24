const ctx = {
    w: 800,
    h: 800,
    mapMode: false,
    MIN_COUNT: 3000,
    ANIM_DURATION: 600, // ms
    NODE_SIZE_NL: 5,
    NODE_SIZE_MAP: 3,
    LINK_ALPHA: 0.2,
    nodes: [],
    links: [],
};

const ALBERS_PROJ = d3.geoAlbersUsa().translate([ctx.w/2, ctx.h/2]).scale([1000]);

// https://github.com/d3/d3-force
const simulation = d3.forceSimulation()
                   .force("link", d3.forceLink()
                                    .id(function(d) { return d.id; })
                                    .distance(5).strength(0.08))
                   .force("charge", d3.forceManyBody())
                   .force("center", d3.forceCenter(ctx.w / 2, ctx.h / 2));

// https://github.com/d3/d3-scale-chromatic
const color = d3.scaleOrdinal(d3.schemeAccent);

function createGraphLayout(svg){
    // var lines = ...;
    

    // var circles = ...;

    circles.call(d3.drag().on("start", (event, d) => startDragging(event, d))
                          .on("drag", (event, d) => dragging(event, d))
                          .on("end", (event, d) => endDragging(event, d)));
};

function switchVis(showMap){
    if (showMap){
        // show network on map
        //...
    }
    else {
        // show NL diagram
        //...
    }
};

function createViz(){
    console.log("Using D3 v"+d3.version);
    d3.select("body")
      .on("keydown", function(event, d){handleKeyEvent(event);});
    let svgEl = d3.select("#main").append("svg");
    svgEl.attr("width", ctx.w);
    svgEl.attr("height", ctx.h);
    loadData(svgEl);
};

function loadData(svgEl){
    // fetch airports.json data about airports (IATA code, name, lat/lon, etc.)
    // flights.json flights connecting those airports
    // states_tz.csv time zones for each state
    // us-states.geojson GeoJSON file for all 50 US states
    //...
    data_paths = [
        d3.json("data/airports.json"),
       d3.json("data/flights.json"),
        d3.csv("data/states_tz.csv"),
        d3.json("data/us-states.geojson")
    ];
    console.log("Loading data...");  
    Promise.all(data_paths).then(function(data){
        ctx.airports = data[0];
        ctx.flights = data[1];
        ctx.states_tz = data[2];
        ctx.states_geo = data[3];

        // create nodes and links
        const findTimezone = function(state){
            for (let i = 0; i < ctx.states_tz.length; i++){
                if (ctx.states_tz[i].State === state){
                    return ctx.states_tz[i].TimeZone;
                }
            }
        }

        // filter links with count < CTX.MIN_COUNT
        ctx.flights = ctx.flights.filter(function(d){
            return d.count >= ctx.MIN_COUNT;
        });

        // filter iata starting with number
        ctx.airports = ctx.airports.filter(function(d){
            return !d.iata[0].match(/[0-9]/);
        });

        // ignore airports that are not connected (possibly as a result of the above flight filtering)
        ctx.airports = ctx.airports.filter(function(d){
            for (let i = 0; i < ctx.flights.length; i++){
                if (d.iata === ctx.flights[i].origin || d.iata === ctx.flights[i].destination){
                    return true;
                }
            }
        });

        ctx.nodes = ctx.airports.map(function(airport){
            return {'id': airport.iata, 'group': findTimezone(airport.state), 'state': airport.state, 'city': airport.city};
        });

        ctx.links = ctx.flights.map(function(flight){
            return {'source': flight.origin, 'target': flight.destination, 'value': flight.count};
        });
                
        // append two groups to the <svg> element: <g id=“links”> and <g id=“nodes”>
        svgEl.append("g").attr("id", "links");
        svgEl.append("g").attr("id", "nodes");

        // bind ctx.links to <g id=“links”> and draw lines
        d3.select("#links").selectAll("line")
            .data(ctx.links)
            .enter()
            .append("line")
            .attr("stroke", "black")
            .attr("stroke-opacity", ctx.LINK_ALPHA);
        
        // bind ctx.nodes to <g id=“nodes”> and draw circles
        const scaleColor = d3.scaleOrdinal(d3.schemeAccent);
        d3.select("#nodes").selectAll("circle")
            .data(ctx.nodes)
            .enter()
            .append("circle")
            .attr("r", ctx.NODE_SIZE_NL)
            .attr("fill", function(d){return scaleColor(d.group);})
            .append("svg:title")
            .text(function(d, i) { return d.city + " - " + d.id; });

        // create d3 force layout
        simulation.nodes(ctx.nodes)
                .on("tick", simStep);
                simulation.force("link")
                .links(ctx.links);
                function simStep(){
                // code run at each iteration of the simulation
                // updating the position of nodes and links
                d3.selectAll("#links line").attr("x1", (d) => (d.source.x))
                .attr("y1", (d) => (d.source.y))
                .attr("x2", (d) => (d.target.x))
                .attr("y2", (d) => (d.target.y));
                d3.selectAll("#nodes circle").attr("cx", (d) => (d.x))
                .attr("cy", (d) => (d.y));
        }});
};

function startDragging(event, node){
    if (ctx.mapMode){return;}
    if (!event.active){
        simulation.alphaTarget(0.3).restart();
    }
    node.fx = node.x;
    node.fy = node.y;
}

function dragging(event, node){
    if (ctx.mapMode){return;}
    node.fx = event.x;
    node.fy = event.y;
}

function endDragging(event, node){
    if (ctx.mapMode){return;}
    if (!event.active){
        simulation.alphaTarget(0);
    }
    // commenting the following lines out will keep the
    // dragged node at its current location, permanently
    // unless moved again manually
    node.fx = null;
    node.fy = null;
}

function handleKeyEvent(e){
    if (e.keyCode === 84){
        // hit T
        toggleMap();
    }
};

function toggleMap(){
    ctx.mapMode = !ctx.mapMode;
    switchVis(ctx.mapMode);
};
