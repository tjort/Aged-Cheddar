// Create the canvas
var Protomove = function() {
	return {
		'canvas': null,
		'context': null,
		'rendering': false,
		'objects': [],
		'lastUpdate': 0,
		'updateIntervalRef': null,

		'totalScore': 0,

		'init': function() {
			/* canvas */
			this.canvas = document.createElement("canvas");
			this.canvas.width = 480;
			this.canvas.height = 320;
			this.context = this.canvas.getContext("2d");
			document.body.appendChild(this.canvas);

			/* polyfill reqanim */
			var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
			window.requestAnimationFrame = requestAnimationFrame;

			/* start */
			this.startRender();
		},
		/* rendering */
		'startRender': function() {
			this.rendering = true;
			this.lastUpdate = Date.now();
			this.render();
		},
		'stopRender': function() {
			this.rendering = false;
			this.lastUpdate = 0;
		},
		'render': function() {
			this.update();
			if (!this.rendering) return false;
			this.objects.sort(this.renderSort);
			this.context.fillStyle= "#000000"; // sets color
			this.context.fillRect(0,0,this.canvas.width,this.canvas.height);
			for (var x=0,max=this.objects.length;x<max;x++) {
				this.objects[x].render(this.context);
			}
			window.requestAnimationFrame($.proxy(this.render,this));
		},
		'renderSort': function(a, b) {
			if (a.zIndex!=b.zIndex) return a.zIndex>b.zIndex;
			return a.position.y>b.position.y;
		},
		'addObject': function(obj) {
			obj.init();
			obj.parent = this;
			this.objects.push(obj);
		},
		'addObjects': function(objs) {
			for (var x=0,max=objs.length;x<max;x++) {
				this.addObject(objs[x]);
			}
		},
		'update': function() {
			var delta = Date.now() - this.lastUpdate;
			for (var x=0,max=this.objects.length;x<max;x++) {
				this.objects[x].update(delta);
			}
			this.lastUpdate = Date.now();
		}
	}
}

/* rooms */
var Protoroom = function(props) {
	return $.extend({
		'zIndex': 0,

		'points': [],

		'triangles': [],
		'trianglesWeight': [],

		'color': '#0000FF',
		'init': function() {
			this.triangulate();
		},
		'update': function() {

		},
		'render': function(c) {
			c.strokeStyle="#FFFFFF";
			c.fillStyle=this.color;
			//c.fillRect(this.position.x,this.position.y,this.size.width,this.size.height);
			c.beginPath();
			c.moveTo(this.points[0][0],this.points[0][1]);
			for (var x=1,max=this.points.length;x<max;x++) {
				c.lineTo(this.points[x][0],this.points[x][1]);
			}
			c.lineTo(this.points[0][0],this.points[0][1]);
			c.fill();
			c.stroke();
		},
		'triangulate': function() {
			var triangles = [];
			for (var x=0,max=this.points.length;x<max;x++) {
				var n = x + 1; if (n == max) n = 0;
				var nn = n + 1; if (nn == max) nn = 0;

				var p 		= this.points[x],
					np 		= this.points[n],
					nnp 	= this.points[nn],
					mid 	= this.middlePoint(p, nnp);

				if (this.inPolygon(mid)) {
					// ok, we can safely create a triangle of these three points
					triangles.push([p,np,nnp]);
					x++;
				}
			}
			// weighed triangle, based on area size
			var totalArea = 0, areas = [];
			for (var x=0,max=triangles.length;x<max;x++) {
				var tri = triangles[x], sides = [];
				// length of each side
				var txa = tri[0][0] - tri[1][0], tya = tri[0][1] - tri[1][1];
				var lena = Math.sqrt(txa*txa+tya*tya);
				var txb = tri[1][0] - tri[2][0], tyb = tri[1][1] - tri[2][1];
				var lenb = Math.sqrt(txb*txb+tyb*tyb);
				var txc = tri[2][0] - tri[0][0], tyc = tri[2][1] - tri[0][1];
				var lenc = Math.sqrt(txc*txc+tyc*tyc);
				// semi peri
				var sp = (lena + lenb + lenc) / 2;
				// area
				var area = Math.sqrt(sp * ((sp - lena) * (sp - lenb) * (sp - lenc)));
				totalArea += area;
				areas.push(area);
			}
			var trianglesWeight = [];
			for (var x=0,max=triangles.length;x<max;x++) {
				trianglesWeight.push(areas[x] / totalArea);
			}
			this.trianglesWeight = trianglesWeight;
			this.triangles = triangles;
		},
		'middlePoint': function(a,b) {
			var ax = a[0], ay = a[1];
			var bx = b[0], by = b[1];
			return [(ax + bx) / 2, (ay + by) / 2];
		},
		'inPolygon': function(point) {

		    var tx = point[0], ty = point[1];

			//console.log("test", tx, ty);

		    var inside = false;
		    for (var x=0,max=this.points.length;x<max;x++) {
				var n = x + 1; if (n == max) n = 0;

				var p 		= this.points[x],
					np 		= this.points[n];

				//console.log("side", p[0], p[1], np[0], np[1]);

				var m1 = (p[1]-np[1])/(p[0]-np[0]);
    			var m2 = (0-ty)/(0-tx);

    			// paralel
    			if (Math.abs(m1-m2) > 0) {

	    			var b1 = p[1]-(p[0])*m1;
	    			var b2 = 0;

	    			var intersectionX = (b1*-1+b2)/(m1-m2);
	    			var intersectionY = m1*intersectionX+b1;

	    			//console.log("inter", intersectionX, intersectionX);

	    			var intersect = (
	    				this.segmentBounds(intersectionX, intersectionY, 0, 0, tx, ty) &&
	    				this.segmentBounds(intersectionX, intersectionY, p[0], p[1], np[0], np[1])
					);
					//console.log("intersect:", intersect);
					if (intersect) inside = !inside;

				}
    		}
    		//console.log("inside:", inside);
    		return inside;
    	},
    	'segmentBounds': function(pX, pY, lX1, lY1, lX2, lY2) {
			var mnX = Math.min(lX1, lX2);
			var mxX = Math.max(lX1, lX2);
			if(!(mnX <= pX && pX <= mxX)) return false;
			return true;
    	},
		'linesBoundingBoxesIntersect': function(x1, y1, x2, y2) {
        return a[0] <= b[1].x && a[1].x >= b[0].x && a[0].y <= b[1].y
                && a[1].y >= b[0].y;
    	},
		'randomPointInTriangle': function(tri) {
    		var a = Math.random();
    		var b = Math.random();

    		if (a + b > 1) {
	        	a = 1-a;
	        	b = 1-b;
    		}

    		var c = 1-a-b;

    		var rndX = (a*tri[0][0])+(b*tri[1][0])+(c*tri[2][0]);
    		var rndY = (a*tri[0][1])+(b*tri[1][1])+(c*tri[2][1]);

    		return [rndX, rndY];
		},
		'randomPoint': function() {
			var a = Math.random(), thresh = 0;
			for (var x=0,max=this.trianglesWeight.length;x<max;x++) {
				var w = this.trianglesWeight[x];
				thresh += w;
				if (thresh >= a) {
					var p = this.randomPointInTriangle(this.triangles[x]);
					return {'x': p[0], 'y': p[1]};
				}
			}
			console.log("error in random point (room)!");
			return false;
		}
	}, props);
}


/* dots */
var Protodot = function(props) {
	return $.extend({
		'parent': null,

		'zIndex': 0,
		'position': {'x': 0, 'y': 0},
		'size': {'width': 5, 'height': 5},
		'color': '#FF0000',
		'clipToRoom': true,

		'room': null,
		'rooms': [],

		'updateThreshold': 100,

		'target': null, //{'x': 0, 'y': 0},
		'start': null,

		'thrust': 0,
		'maxThrust': 20,

		'angle': 0,
		'lastUpdate': 0,

		'score': 0,

		'init': function() {
			// place x,y inside current room
			this.position = this.randomPositionInRoom();
		},
		'update': function(d) {
			if (this.lastUpdate > this.updateThreshold) {

				this.step();
				this.lastUpdate = 0;
			}

			// if so, adjust our position with delta
			this.lastUpdate += d;
		},
		'step': function() {
				if (this.target==null) {
					this.setTarget(this.randomPositionInRoom());
				}

				var tx = this.target.x - this.position.x,
				    ty = this.target.y - this.position.y,
				    dist = Math.sqrt(tx*tx+ty*ty),
				    angle = Math.atan2(ty,tx)/Math.PI * 180;

				var startTx = this.start.x - this.position.x,
				    startTy = this.start.y - this.position.y,
				    startDist = Math.sqrt(startTx*startTx+startTy*startTy),
				    progress = 1 - (dist / (dist + startDist));

				this.thrust = 10*Math.sin(progress*Math.PI)+1;

				// try to rotate to angle
				var maxRotation = 20;
				if (dist < 20) maxRotation = 50;
				if (Math.random() > 0.95) maxRotation = 90;
				this.angle = this.moveAngleTowards(this.angle, angle, maxRotation);

			    var velX = this.thrust*Math.cos(this.toRadian(this.angle));
			    var velY = this.thrust*Math.sin(this.toRadian(this.angle));

				this.position.x += velX;
				this.position.y += velY;

				// look into the future
				var tx = this.target.x - this.position.x,
				    ty = this.target.y - this.position.y,
				    dist = Math.sqrt(tx*tx+ty*ty),
					angle2 = Math.atan2(ty,tx)/Math.PI * 180;

				var done = false;
				if (dist < this.thrust) {
					if (angle > 0 && angle2 < 0) done = true;
					if (angle < 0 && angle2 > 0) done = true;
					if (dist <= 1) done = true;
				}

			    if (done) {
			    	console.log("ALL DONE");
			    	this.clipToRoom = true;
			    	this.score++;
			    	if (this.score > 9) {
			    		this.score = 0;
			    		var newRoom = this.rooms[Math.floor(Math.random()*this.rooms.length)];
			    		if (newRoom != this.room) {
			    			this.room = newRoom;
			    			this.clipToRoom = false;
			    		}
			    	}
			    	this.target = this.randomPositionInRoom();
			    }

				if (!this.inRoom(this.position) && this.clipToRoom) {
					this.color = "#A0CDD2";
					//this.thrust -= 1;
					// this.position.x -= velX;
					// this.position.y -= velY;
				} else {
					this.color = "#FF0000";
				}
		},

		'render': function(c) {
			// highlight target
			if (this.target != null) {
				c.fillStyle= "#000000"; // sets color
				c.beginPath();
				c.arc(this.target.x, this.target.y, 5, 0, Math.PI*2, true);
				c.closePath();
				c.fill();
			}

			c.fillStyle= this.color; // sets color
			c.beginPath();
			c.arc(this.position.x, this.position.y, 5, 0, Math.PI*2, true);
			c.closePath();
			c.fill();
		},
		'randomPositionInRoom': function() {
			return this.room.randomPoint();
		},
		'inRoom': function(position) {
			return this.room.inPolygon([position.x,position.y]);
		},
		'setTarget': function(position) {
			this.target = {'x': position.x, 'y': position.y};
			this.start = {'x': this.position.x, 'y': this.position.y};
		},
		'moveAngleTowards': function(a, b, maxRotation) {
			if (a == b) return b;

			var netAngle = (a - b + 360)%360;
        	var delta = Math.min(Math.abs(netAngle-360), netAngle, maxRotation);
        	var sign  = (netAngle-180) >= 0 ? 1 : -1;

	        var c = a + (sign*delta+360);
        	return c%360;
		},
		'increaseThrust': function() {
			var t = this.thrust + 0.5;
			if (t>this.maxThrust) t = this.maxThrust;
			this.thrust = t;
		},
		'decreaseThrust': function() {
			var t = this.thrust - 0.5;
			if (t<1) t = 1;
			this.thrust = t;
		},

		/* convenience */
		'randomIntBetween': function(min,max) {
			return Math.random() * (max - min) + min;
		},
		'toDegrees': function(radian) {
			return radian * 180 / Math.PI;
		},
		'toRadian': function(degrees) {
			return degrees * Math.PI / 180;
		}

	}, props);
}

// ===

$(function() {
	var protomove = new Protomove();
	protomove.init();

	// add a room to the prototype
	var rooms = [];

	var p = [
		[100, 100],
		[200, 120],
		[240, 240],
		[60, 230]
	];
	var blueRoom = new Protoroom(
		{'zIndex': 10, 'points': p}
	);
	rooms.push(blueRoom);

	// add
	protomove.addObjects(rooms);

	// add some dots that can move inside rooms and from room to room

	for (var x=0; x<1000;x++) {
		protomove.addObject(new Protodot(
			{'zIndex': 100, 'room': blueRoom, 'rooms': rooms}
		));
	}


});