/*
The MIT License (MIT)

Copyright (c) 2014 Jerry Gamble

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

"use strict";

var metadata = {
    "isOptimal": 0, "objectiveVal": 0, "customerCount": 0, "vehicleCount": 0, "vehiclesUsed": 0,
    "vehicleCapacity": 0, "x_min": 0, "x_max": 0, "x_span": 0, "y_min": 0, "y_max": 0, "y_span": 0,
    "circle_size" : 0, "graphHeight": 0, "graphWidth": 0
}
var points = [];
var routes = [];
var edges = [];

function parseInputText(data) {

    if (DEBUG) {
        console.log("--- loading problem data");
    }

    //clear data
    metadata = {
        "isOptimal": 0, "objectiveVal": 0, "customerCount": 0, "vehicleCount": 0, "vehiclesUsed": 0,
        "vehicleCapacity": 0, "x_min": 0, "x_max": 0, "x_span": 0, "y_min": 0, "y_max": 0, "y_span": 0,
        "circle_size": 0, "graphHeight": 0, "graphWidth": 0
    }
    points = [];
    var routes = [];

    data = data.trim();
        
    var lines = data.split(REGEX_NEWLINE);
    var params = lines[0].split(REGEX_WHITESPACE);

    metadata['customerCount'] = parseInt(params[0]);
    metadata['vehicleCount'] = parseInt(params[1]);
    metadata['vehicleCapacity'] = parseInt(params[2]);
        
    //problem boundaries  
    var minX = Infinity;
    var maxX = -Infinity;
    var minY = Infinity;
    var maxY = -Infinity;

    var parts;
    var point;

    for (var i = 1; i < lines.length; i++) {

        parts = lines[i].split(REGEX_WHITESPACE);

        point = { 'index': i-1, 'demand': parseInt(parts[0]), 'x': parseFloat(parts[1]), 'y': parseFloat(parts[2]) };

        minX = Math.min(minX, point['x']);
        maxX = Math.max(maxX, point['x']);
        minY = Math.min(minY, point['y']);
        maxY = Math.max(maxY, point['y']);

        points[i - 1] = point;

    }

    metadata['x_min'] = minX;
    metadata['x_max'] = maxX;
    metadata['x_span'] = maxX - minX;
    metadata['y_min'] = minY;
    metadata['y_max'] = maxY;
    metadata['y_span'] = maxY - minY;

    if (DEBUG) {
        console.log("--- parsed points");
        console.log("Line Data: " + lines);
        console.log("Line Count: " + lines.length);
        console.log(points);

        console.log("--- metadata");
        console.log(metadata);
    }

}
    
function parseSolutionText(data, size) {
  
    routes = [];
    edges = [];

    data = data.trim();
        
    var lines = data.split(REGEX_NEWLINE);
    var seq = lines[1].split(REGEX_WHITESPACE);

    //solution params
    metadata.vehiclesUsed = lines.length - 1;
    var params = lines[0].split(REGEX_WHITESPACE);
    metadata.objectiveVal = parseFloat(params[0]);
    metadata.isOptimal = parseInt(params[1]);

    //routes for vehicles
    var seq = [];

    for (var i = 1; i < lines.length; i++) {

        //yes I know this is evil...
        seq = lines[i].split(REGEX_WHITESPACE);

        for (var j = 0; j < seq.length; j++) {
            seq[j] = parseInt(seq[j]);
        }

        routes[i - 1] = seq;

        //edges resulting from routes
        var edge;
        edges[i - 1] = [];
        for (var j = 0; j < seq.length - 1; j++) {
            edge = { 'from': points[seq[j]], 'to': points[seq[j + 1]] }
            edges[i - 1][j] = edge;
        }

    }

    if (DEBUG) {
        console.log("--- parsed solution");
        console.log(metadata);
        console.log(routes);
        console.log(edges)
    }

}
    
function cleanViz(){
    var svg = d3.select("#viz svg").data([]).exit().remove();
}
    
function vizBenchmark() {

    //determine width based on available space
    metadata.graphWidth = DEFAULT_GRAPH_WIDTH;

    //chart width
    try {
        metadata.graphWidth = d3.select("#viz")[0][0].clientWidth;
    } catch (ex) {
        reportError(ex);
    }

    //chart height
    metadata.graphHeight = DEFAULT_GRAPH_HEIGHT;

    try {
        metadata.graphHeight = window.innerHeight - d3.select("#data")[0][0].offsetTop - X_AXIS_PAD;

        if (metadata.graphHeight < 1) {
            metadata.graphHeight = DEFAULT_GRAPH_HEIGHT;
        }

    } catch (ex) {
        reportError(ex);
    }

    //var height = Math.round(width * (metadata['y_span'] / metadata['x_span']));
    metadata.circle_size = Math.min(Math.max(1, metadata.graphWidth / metadata['customerCount']), 5);;
        
    var xScale = d3.scale.linear()
        .domain([metadata['x_min'], metadata['x_max']])
        .range([Y_AXIS_PAD + PAD_ADJUST, metadata.graphWidth - PAD_ADJUST]);
        
    var yScale = d3.scale.linear()
        .domain([metadata['y_min'], metadata['y_max']])
        .range([metadata.graphHeight - PAD_ADJUST - X_AXIS_PAD, PAD_ADJUST]);
        
    if (DEBUG) {
        //console.log(scaleFactor);
        console.log(metadata.graphWidth);
        console.log(metadata.graphHeight);
    }
        
    cleanViz();
	 
    var svg = d3.select("#viz")
        .append("svg")
        .attr("class", "svgMain")
        .attr("width", metadata.graphWidth)
        .attr("height", metadata.graphHeight);
		
	//parent group for nodes and links
	svg.append("g").attr("id", "links");
	svg.append("g").attr("id", "nodes");
 
    var xAxisLabel = "X Coordinate"
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient("bottom")
        .ticks(Math.round(metadata.graphWidth / 100) + 1);
        
        
    svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0," + (metadata.graphHeight - X_AXIS_PAD) + ")")
        .call(xAxis)
        .append("text")
            .attr("class", "axis axis_label")
            .attr("text-anchor", "middle")
            .attr("x", (metadata.graphWidth - Y_AXIS_PAD) / 2 + Y_AXIS_PAD)
            .attr("y", X_AXIS_PAD - PAD_ADJUST)
            .text(xAxisLabel);
        
        
    var yAxisLabel = "Y Coordinate"
    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient("left")
        .ticks(Math.round(metadata.graphHeight / 100) + 1);
        
    svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(" + Y_AXIS_PAD + ",0)")
        .call(yAxis)
        .append("text")
            .attr("class", "axis axis_label")
            .attr("text-anchor", "middle")
            .attr("x", -(metadata.graphHeight - X_AXIS_PAD) / 2)
            .attr("y", -Y_AXIS_PAD + 10)
            .attr("transform", "rotate(-90)")
            .text(yAxisLabel);
        
    svg.select("#nodes").selectAll("circle")
        .data(points)
        .enter()
        .append("circle")
        .attr("id", function (d) { return "custPnt" + d.index; })
        .attr("cx", function(d) {return xScale(d['x']);})
        .attr("cy", function(d) {return yScale(d['y']);})
        .attr("r", metadata.circle_size)
		.attr("fill", NODE_COLOR)
		.style("opacity", 1)
        .on("mouseover", function (d) {
		
			//prevent tool tip from falling off page
			var left = d3.event.pageX;
			if ((left + div[0][0].clientWidth) > window.innerWidth) {
				left = left - div[0][0].clientWidth;
			}
			
            div.transition()
                .duration(200)
                .style("opacity", .85)
				.style("left", (left) + "px")
                .style("top", (d3.event.pageY - 25) + "px");
            div.html("#" + d.index + ": Demand " + d.demand + " (X:" + d.x + ", Y:" + d.y + ")");
        })
        .on("mouseout", function (d) {
            div.transition()
                .duration(500)
                .style("opacity", 0);
        });

    svg.select("#custPnt0").style("fill", START_NODE_COLOR);
    svg.select("#custPnt0").attr("r", metadata.circle_size * 2);

    //data
    var metadataStr = "";
    d3.selectAll("#problemTable tbody *").remove();
	d3.selectAll("#solutionTable tbody *").remove();

    metadataStr += "<tr><td colspan='2' class='metaSectionTitle'>Problem</td></tr>";
    metadataStr += "<tr><td class='metaElement'>Customers</td><td class='metaValue'>" + metadata["customerCount"] + "</td></tr>";
    metadataStr += "<tr><td class='metaElement'>Vehicle Count</td><td class='metaValue'>" + metadata["vehicleCount"] + "</td></tr>";
    metadataStr += "<tr><td class='metaElement'>Vehicle Capacity</td><td class='metaValue'>" + metadata["vehicleCapacity"] + "</td></tr>";

    d3.select("#problemTable tbody").html(metadataStr);

    //tool tips for circles
	d3.selectAll("div.tooltip").remove();
    var div = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);
    
}
    
function vizSolution() {

    //solution details
	d3.selectAll("#solutionTable tbody *").remove();
	
    var metadataStr = "";
    metadataStr += "<tr><td colspan='2' class='metaSectionTitle'>Your Solution</td></tr>";
    metadataStr += "<tr><td class='metaElement'>Objective Value</td><td class='metaValue'>" + roundNumber(metadata["objectiveVal"], 4) + "</td></tr>";
    metadataStr += "<tr><td class='metaElement'>Optimal?</td><td class='metaValue'>" + metadata.isOptimal + "</td></tr>";
    metadataStr += "<tr><td class='metaElement'>Vehicles Used</td><td class='metaValue'>" + metadata["vehiclesUsed"] + "</td></tr>";

    d3.select("#solutionTable tbody").html(d3.select("#solutionTable tbody").html() + metadataStr);

    var line_width = metadata.circle_size / 2;
        
    var xScale = d3.scale.linear()
        .domain([metadata.x_min, metadata.x_max])
        .range([Y_AXIS_PAD + PAD_ADJUST, metadata.graphWidth - PAD_ADJUST]);

    var yScale = d3.scale.linear()
        .domain([metadata.y_min, metadata.y_max])
        .range([metadata.graphHeight - PAD_ADJUST - X_AXIS_PAD, PAD_ADJUST]);

    var svg = d3.select("#viz svg");
        
    svg.selectAll("line").data([]).exit().remove();
    
    //unique colors for each route
    var colors = makeColorGradient(edges.length);

    //route plots
    var capacityUsed = 0;
    metadataStr = "";
    metadataStr += "<tr><td class='metaSectionSubTitle'>Vehicle #</td><td class='metaSectionSubTitle'>Used Capacity</td></tr>";
    d3.select("#solutionTable tbody").html(d3.select("#solutionTable tbody").html() + metadataStr);

    for (var i = 0; i < edges.length; i++) {

        svg.select("#links").selectAll(".line")
            .data(edges[i])
            .enter()
            .append("line")
            .attr("x1", function (d) {
                return xScale(d['from']['x']);
            })
            .attr("y1", function (d) {
                return yScale(d['from']['y']);
            })
            .attr("x2", function (d) {
                return xScale(d['to']['x']);
            })
            .attr("y2", function (d) {
                return yScale(d['to']['y']);
            })
            .attr("stroke", colors[i])
            .attr("stroke-opacity", "0.5")
            .attr("stroke-width", line_width)
            .attr("class", "vh" + i);

        //caculate vehicle capacity used
        capacityUsed = 0;

        for (var j = 0; j < edges[i].length; j++) {
            capacityUsed += edges[i][j].to.demand;
        }

        metadataStr = "";

        if (capacityUsed > metadata.vehicleCapacity) {
            metadataStr = "<tr><td class='metaVehicleTitle' style='color: " + colors[i] + "'>Vehicle " + (i + 1) + "</td><td class='metaValue error'>(over) " + roundNumber(capacityUsed, 2) + "</td></tr>";
        } else {
            metadataStr = "<tr><td class='metaVehicleTitle' style='color: " + colors[i] + "'>Vehicle " + (i + 1) + "</td><td class='metaValue'>" + roundNumber(capacityUsed, 2) + "</td></tr>";
        }

        d3.select("#solutionTable tbody").html(d3.select("#solutionTable tbody").html() + metadataStr);

    }

}
    
function loadBenchmark(text){
    parseInputText(text);
    vizBenchmark();
}
    
function loadSolution(text){
    parseSolutionText(text);
    vizSolution();
}
    