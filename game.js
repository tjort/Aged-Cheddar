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
			this.canvas.width = 800;
			this.canvas.height = 800;
			this.context = this.canvas.getContext("2d");
			document.body.appendChild(this.canvas);

			/* polyfill reqanim */
			var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
			window.requestAnimationFrame = requestAnimationFrame;

			// create rooms
			var rooms = this.randomRooms();
			for (var x=0,max=rooms.length;x<max;x++) {
				this.addObject(rooms[x]);
			}

			//create protodot in random room
			this.addObject(new Protodot(
			{'zIndex': 100, 'room': rooms[0], 'rooms': rooms, 'color': '#FF0000'}
			));

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
			if (typeof(a.position) == 'undefined') return false;
			return a.position.y>b.position.y;
		},
		'addObject': function(obj) {
			obj.init();
			obj.parent = this;
			this.objects.push(obj);
		},

		'randomRooms': function() {
			// generate an array of random rooms
			var rooms = [], maxRooms = 1;

			for (x = 0; x < maxRooms; x++) {
				// p is an array of points that makes up a room
				var center = [(Math.random() * (this.canvas.width - 20)) + 20, (Math.random() * (this.canvas.height - 20) + 20)];
				var p = [], maxP = 6, angle = 45, angleAdd = Math.floor(360 / maxP);
//(Math.random() * 10) + 3
				for (x2 = 0; x2 < maxP; x2++) {
					var pointX = -1, pointY = -1, lineTry = Math.random() * 50 + 50;

					var safety = 0;
					while (pointX<0 || pointX>this.canvas.width || pointY<0 || pointY>this.canvas.height) {
						lineTry = lineTry - 1;
						pointX = Math.floor(center[0] + lineTry*Math.cos(angle * Math.PI / 180));
			    		pointY = Math.floor(center[1] + lineTry*Math.sin(angle * Math.PI / 180));
			    		safety++;
			    		if (safety>999 || lineTry < 0) {
			    			console.log("err");
			    			break;
			    		}
			    	}

					// we go around drawing lines of varying height, if they are possible.
					// if not we decrease the line height until we can
			    	// at every point push it
					p.push([pointX, pointY]);
					angle = (angle + angleAdd) % 360;
				}

				console.log("adding room", p);
				var room = new Protoroom({'zIndex': 10, 'points': p});
				rooms.push(room);
			}
			return rooms;
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

			c.beginPath();
			c.moveTo(this.points[0][0],this.points[0][1]);
			for (var x=1,max=this.points.length;x<max;x++) {
				c.lineTo(this.points[x][0],this.points[x][1]);
			}
			c.lineTo(this.points[0][0],this.points[0][1]);
			c.fill();
			c.stroke();

			// render triangles
			c.fillStyle='rgba(0,0,0,0)';
			c.strokeStyle='#00FF00';
			c.beginPath();
			for (var x=0,max=this.triangles.length;x<max;x++) {
				c.moveTo(this.triangles[x][0][0],this.triangles[x][0][1]);
				c.lineTo(this.triangles[x][1][0],this.triangles[x][1][1]);
				c.lineTo(this.triangles[x][2][0],this.triangles[x][2][1]);
				c.lineTo(this.triangles[x][0][0],this.triangles[x][0][1]);
			}
			c.stroke();
		},
		'triangulate': function() {
			var triangles = [];
			var points = this.points.slice(0, this.points.length);

			var x = 0; var safety=0;
			while (points.length > 3) {
				var max = points.length-1;
				if (x>max) x = x%max;
				var n = x + 1; if (n > max) n = n%max;
				var nn = n + 1; if (nn > max) nn = nn%max;
				console.log("sampling", x, n, nn);

				var p 		= points[x],
					np 		= points[n],
					nnp 	= points[nn],
					midA 	= this.middlePoint(p, nnp);

				if (this.inPolygon(midA)) {
					// ok, we can safely create a triangle of these three points
					triangles.push([p,np,nnp]);
					//points.splice(nn,1);
					points.splice(n,1);
					//points.splice(x,1);
					// points[n] = midA;
					// points.splice(nn, 1);
					// points.splice(x, 1);
					console.log("pts", points);
				}
				x++;
				safety++;
				if (safety > 999) {
					console.log("safety hatch");
					break;
				}
			}
			if (points.length == 3) {
				triangles.push([points[0],points[1],points[2]]);
			}
			console.log(triangles);

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

		'updateThreshold': 10,

		'target': null, //{'x': 0, 'y': 0},
		'start': null,

		'thrust': 0,
		'maxThrust': 10,

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
				this.thrust = 1;
				var maxRotate = Math.max(Math.abs(20 - (2 * this.thrust)), 5);
				var angle = this.moveAngleTowards(this.angle, Math.floor(Math.random()*360), maxRotate);
				this.angle = angle;

			    var velX = this.thrust*Math.cos(this.toRadian(this.angle));
			    var velY = this.thrust*Math.sin(this.toRadian(this.angle));

				this.position.x += velX;
				this.position.y += velY;

				// // look into the future
				// var tx = this.target.x - this.position.x,
				//     ty = this.target.y - this.position.y,
				//     dist = Math.sqrt(tx*tx+ty*ty),
				// 	angle2 = Math.atan2(ty,tx)/Math.PI * 180;

				// var done = false;
				// if (dist < this.thrust) {
				// 	if (angle > 0 && angle2 < 0) done = true;
				// 	if (angle < 0 && angle2 > 0) done = true;
				// 	if (dist <= 1) done = true;
				// }

			 //    if (done) {
			 //    	console.log("ALL DONE");
			 //    	this.clipToRoom = true;
			 //    	this.score++;
			 //    	if (this.score > 9) {
			 //    		this.score = 0;
			 //    		var newRoom = this.rooms[Math.floor(Math.random()*this.rooms.length)];
			 //    		if (newRoom != this.room) {
			 //    			this.room = newRoom;
			 //    			this.clipToRoom = false;
			 //    		}
			 //    	}
			 //    	this.target = this.randomPositionInRoom();
			 //    }

				if (!this.inRoom(this.position) && this.clipToRoom) {
					this.color = "#A0CDD2";
					console.log(this.angle);
					this.angle = (this.angle+180)%360;
				} else {
					this.color = "#FF0000";

				}
		},

		'render': function(c) {
			// highlight target
//			if (this.target != null) {
//				c.fillStyle= "#000000"; // sets color
//				c.beginPath();
//				c.arc(this.target.x, this.target.y, 5, 0, Math.PI*2, true);
//				c.closePath();
//				c.fill();
//			}

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
});