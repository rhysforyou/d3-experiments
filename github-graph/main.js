function GitHubGraph() {
  var w = 1200,
      h = 600,
      node,
      link,
      root,
      rootRepo,
      force,
      svg,
      tooltip;

  function graph(selection) {
    svg = selection.append("svg:svg")
        .attr("width", w)
        .attr("height", h);

    force = d3.layout.force()
        .on("tick", tick)
        .charge(function(d) { return d._children ? -d.size / 50 : -30; })
        .linkDistance(function(d) { return d.target.children ? 80 : 30; })
        .size([w, h - 160]);

    tooltip = selection.append("div")
        .attr("id", "chart-tooltip")
        .style("position", "absolute")
        .style("opacity", "0.0")
        .style("pointer-events", "none");

    d3.xhr("https://api.github.com/repos/" + rootRepo, "application/vnd.github.beta+json", function(xhr) {
      root = JSON.parse(xhr.response);
      root.fixed = true;
      root.x = w / 2;
      root.y = h / 2 - 80;
      root.type = "repo"
      update();
    });
  }

  graph.width = function(value) {
    if (!arguments.length) return w;
    w = value;
    return graph;
  }

  graph.height = function(value) {
    if (!arguments.length) return h;
    h = value;
    return graph;
  }

  graph.repo = function(value) {
    if (!arguments.length) return rootRepo;
    rootRepo = value;
    return graph;
  }

  function update() {
    var nodes = flatten(root),
        links = d3.layout.tree().links(nodes);

    // Restart the force layout
    force
        .nodes(nodes)
        .links(links)
        .start();

    // Update the links
    link = svg.selectAll("line.link")
        .data(links, function(d) { return d.target.id; });

    // Enter any new links
    link.enter().insert("svg:line", ".node")
        .attr("class", "link")
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    // Exit any old links
    link.exit().remove();

    node = svg.selectAll("circle.node")
        .data(nodes, function(d) { return d.id; })
        .style("fill", color)

    node.transition()
        .attr("r", function(d) { return d.children ? 4.5 : Math.sqrt(d.size) / 2; });

    // Enter any new nodes
    node.enter().append("svg:circle")
        .attr("class", "node")
        .attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; })
        .attr("r", function(d) { return d.children ? 4.5 : Math.sqrt(d.size) / 2; })
        .style("fill", color)
        .on("click", click)
        .on("mouseover", showTooltip)
        .on("mousemove", moveTooltip)
        .on("mouseout", hideTooltip)
        .call(force.drag);

    // Exit any old nodes
    node.exit().remove();
  }

  function tick() {
    link.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    node.attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });
  }


  function color(d) {
    if (d.type === "repo") {
      return "#3498DB";
    } else if (d.type === "user") {
      return "#E74C3C"
    } else {
      return "#F0F";
    }
  }

  // Returns a list of all nodes under the root.
  function flatten(root) {
    var nodes = [], i = 0;

    function recurse(node) {
      if (node.children) node.children.forEach(recurse);
      nodes.push(node);
    }

    recurse(root);
    return nodes;
  }

  // Toggle children on click.
  function click(d) {
    console.log(d.id)
    if (!d.expanded) {
      expandNode(d)
    } else if (d.children) {
      d._children = d.children;
      d.children = null;
    } else {
      d.children = d._children;
      d._children = null;
    }
    update();
  }

  // Load more remote info about a node.
  function expandNode(d) {
    var url;

    if (d.type === "repo") {
      url = "https://api.github.com/repos/" + d.full_name + "/contributors?anon=1"
    } else if (d.type === "user") {
      url = "https://api.github.com/users/" + d.login + "/repos"
    } else {
      return;
    }

    d3.xhr(url, "application/vnd.github.beta+json", function(xhr) {
      var response = JSON.parse(xhr.response);
      response.forEach(function(node) {
        node.type = (d.type === "repo" ? "user" : "repo");
        node.id = d.id + "-" + node.id;
        if (node.type === "user") {
          node.size = node.contributions;
        } else if (node.type === "repo") {
          node.size = node.watchers;
        }
      });

      d.children = response;
      d.expanded = true;

      update();
    });
  }

  function showTooltip(d) {
    // Move the tooltip into place
    tooltip
        .style("left", d3.event.pageX + "px")
        .style("top", d3.event.pageY + "px")

    if (d.type === "repo") {
      tooltip.text(d.full_name)
    } else if (d.login) {
      tooltip.text(d.login)
    } else {
      tooltip.text("anonymous")
    }

    // Fade the tooltip in
    tooltip.transition()
        .style("opacity", 0.7)
  }

  function moveTooltip(d) {
    // Move the tooltip into place
    tooltip
        .style("left", d3.event.pageX + 16 + "px")
        .style("top", d3.event.pageY + "px")
  }

  function hideTooltip(d) {
    tooltip.transition()
      .style("opacity", "0.0");
  }

  function getURLParameter(name) {
      return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
  }

  return graph;
}

var graph = GitHubGraph()
    .width(1200)
    .height(600)
    .repo("mbostock/d3");

d3.select('body').call(graph);

