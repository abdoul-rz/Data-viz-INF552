const ctx = {
    w: 1280,
    h: 720,
};

// clipping
function clipText(svg) {
  svg.selectAll(".leaf").append("clipPath")
     .attr("id", d => "clip-" + d.data.id)
     .append("use")
     .attr("xlink:href", d => "#" + d.data.id);
  d3.selectAll(".leaf text")
    .attr("clip-path", d => `url(#clip-${d.data.id})`);
}

function createTreemap(data, svg){
    // create a treemap layout
    // Use d3.treemapBinary as the tiling method
    const someTilingMethod = d3.treemapBinary;
    let treemap = d3.treemap()
                .tile(someTilingMethod)
                .size([ctx.w,ctx.h])
                .paddingInner(3).paddingOuter(6);

    data.eachBefore(d => d.data.id = d.data.Code);
    data.sum(sumByCount);
    function sumByCount(d) {
        return 1;
    };

    treemap(data);
    // create a group for each node
    let nodes = svg.selectAll("g")
                .data(data.descendants())
                .enter().append("g")
                .attr("transform", d => `translate(${d.x0},${d.y0})`)
                .classed("leaf", d => d.children == null); 

    let fader = function(c){return d3.interpolateRgb(c, "#fff")(0.6);},
        color = d3.scaleOrdinal(d3.schemeCategory10.map(fader)); 
    // Use tinycolor.js (already imported) to draw labels using the same color as the corresponding rectangle,
    // but darker (instead of black)
    // each node is represented by a rectangle
    nodes.append("rect")
        .attr("id", d => d.data.id) 
        .attr("stroke", d => tinycolor(color(d.data.Code.substring(0, 4))).darken(40))
        .attr("fill", d => color(d.data.Code.substring(0, 4)))
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0)

    // and a text
    d3.selectAll(".leaf").append("text")
        .style("fill", d => tinycolor(color(d.data.Code.substring(0, 4))).darken(40))
        .selectAll("tspan")
        .data(d => d.data.Description.split(" "))
        .enter().append("tspan")
        .attr("x", 4)
        .attr("y", (d, i) => (13 + i * 10))
        .text(d => d);
    clipText(svg);   
};

function createViz(){
    console.log("Using D3 v"+d3.version);
    let svgEl = d3.select("#main").append("svg");
    svgEl.attr("width", ctx.w);
    svgEl.attr("height", ctx.h);
    loadData(svgEl);
};

function loadData(svgEl){
    // load cofog.csv
    d3.csv("data/cofog.csv", d3.autoType).then(data => {
        // The first task consists of reconstructing the hierarchy
        // and putting it in an instance of d3-hierarchy

        // n, before calling d3.stratify() on the data, we still need to do one more thing: insert a dummy root
        // node, which we will call COFOG
        data.unshift({Level: 1, Code: "COFOG", Amount: null, Description: ""});
        const getParentCode = (code) => {
            if (code === "COFOG") {
                return null;
            }
            const parentId = code.substring(0, code.length - 2);
            if (parentId.length === 2) {
                return "COFOG";
            }
            return parentId;
        };
        let root = d3.stratify()
                    .id(d => d.Code)
                    .parentId(d => getParentCode(d.Code))
                    (data);
        createTreemap(root, svgEl);
    }
    );
    // and call createTreemap(...) passing this data and svgEL
};
