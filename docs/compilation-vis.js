var md = markdownit();

var width = 700,
    height = 700,
    radius = Math.min(width, height) / 2;

var x = d3.scale.linear()
    .range([0, 2 * Math.PI]);

var y = d3.scale.sqrt()
    .range([0, radius]);

var color = d3.scale.category20c();

var svg = d3.select("#compilation-vis")
  .append("svg")
    .attr("width", width)
    .attr("height", height)
  .append("g")
    .attr("transform", "translate(" + width / 2 + "," + (height / 2 + 10) + ")");

var tooltip = d3.select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("position", "absolute")
  .style("z-index", "10")
  .style("opacity", 0);

var doc = d3.select("#doc");

var partition = d3.layout.partition()
    .value(function(d) { return d.size; });

var arc = d3.svg.arc()
    .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x))); })
    .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx))); })
    .innerRadius(function(d) { return Math.max(0, y(d.y)); })
    .outerRadius(function(d) { return Math.max(0, y(d.y + d.dy)); });

function updateToolTip (d) {
  tooltip.html(function () {
    return "<b>" + d.name + "</b>";
  });
  return tooltip.transition()
    .duration(50)
    .style("opacity", 0.7);
}

d3.json("./compilation.json", function(error, root) {
  if (error) throw error;

  var path = svg.selectAll("path")
      .data(partition.nodes(root))
    .enter().append("path")
      .attr("d", arc)
      .style("fill", function (d) { return color((d.children ? d : d.parent).name); })
      .on("click", click)
      .on("mouseover", updateToolTip)
      .on("mousemove", function (d) {
        return tooltip
          .style("top", (d3.event.pageY-10)+"px")
          .style("left", (d3.event.pageX+10)+"px");
      })
      .on("mouseout", function (){
        return tooltip.style("opacity", 0);
      });

  function click(d) {
    path.transition()
      .duration(1500)
      .attrTween("d", arcTween(d));
    doc.html(function () {
      return md.render(d.markdown);
    });
  }
});

function arcTween(d) {
  var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
      yd = d3.interpolate(y.domain(), [d.y, 1]),
      yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius]);
  return function(d, i) {
    return i
        ? function(t) { return arc(d); }
        : function(t) { x.domain(xd(t)); y.domain(yd(t)).range(yr(t)); return arc(d); };
  };
}
