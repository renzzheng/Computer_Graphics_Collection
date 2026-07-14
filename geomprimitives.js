//Purpose: The engine behind the 3D primitive operations for Mini Assignment 1

vec3 = glMatrix.vec3;

//////////////////////////////////////////////
///********         PART 1          *******///
//////////////////////////////////////////////


/**
 * Compute the angle between the vectors ab and ac
 * @param {vec3} a First point
 * @param {vec3} b Second point
 * @param {vec3} c Third point
 * 
 * @return {float} Angle between vectors ab and ac in degrees
 */
function getAngle(a, b, c) {
    // TODO: Fill this in

    // create ab and ac 
    let ab = vec3.create();
    let ac = vec3.create();

    // calculate ab and ac
    vec3.subtract(ab, b, a);
    vec3.subtract(ac, c, a);

	// calculate dot product ab and ac
	let dotproduct = vec3.dot(ab, ac);

	// calculate magnitude
	let magnitudeAB = vec3.length(ab);
    let magnitudeAC = vec3.length(ac);

	// As a corner case, if one or both of the vectors have magnitude 0, you should return -1
	if (magnitudeAB === 0 || magnitudeAC === 0) {
		return -1; // error
	} else {
		// calculate the angle between ab and ac in degrees
		angle = (Math.acos(dotproduct / (magnitudeAB * magnitudeAC))) * (180/Math.PI)
		return angle;
	}

}



/**
 * Project vector u onto vector v using the glMatrix library
 * @param {vec3} u Vector that's being projected
 * @param {vec3} v Vector onto which u is projected
 * 
 * @return {vec3} The projection of u onto v
 */
function projVector(u, v) {
    // TODO: Fill this in

	let projVector = vec3.create();
	let magnitudeV2 = vec3.squaredLength(v);

	// As a corner case, if v has a magnitude of 0, you should return the vector (0, 0, 0), regardless of what u is.
	if (magnitudeV2 === 0) {
		return vec3.fromValues(0,0,0);
	}

	let dotProductUV = vec3.dot(u,v);
	let projScalar = dotProductUV / magnitudeV2;

	vec3.scale(projVector, v, projScalar);

	return projVector;

}


/**
 * 
 * @param {vec3} u Vector that's being projected
 * @param {vec3} v Vector onto which u is perpendicularly projected
 * 
 * @return {vec3} The perpendicular projection of u onto v
 */
function projPerpVector(u, v) {
    // TODO: Fill this in

		// corner caes if v is zero vector...
		let magnitudeV2 = vec3.squaredLength(v);
	
		if (magnitudeV2 === 0) {
			return vec3.fromValues(0,0,0);
		}
	
	
		let projUonV = projVector(u,v);
	
		let projPerp = vec3.create();
		vec3.subtract(projPerp, u, projUonV);
	
		return projPerp;

}


/**
 * Given three 3D vertices a, b, and c, compute the area 
 * of the triangle they span
 * @param {vec3} a First point
 * @param {vec3} b Second point
 * @param {vec3} c Third point
 * 
 * @return {float} Area of the triangle
 */
function getTriangleArea(a, b, c) {
    // TODO: Fill this in

		// calculate ab and ac
		let ab = vec3.create();
		let ac = vec3.create();
		vec3.subtract(ab, b, a); // ab = b - a
		vec3.subtract(ac, c, a); // ac = c - a
	
		let crossproduct = vec3.create();
		vec3.cross(crossproduct, ab, ac);
	
		let area = vec3.length(crossproduct)/2;
	
		return area;

}


/**
 * For a plane determined by the points a, b, and c, with the plane
 * normal determined by those points in counter-clockwise order using 
 * the right hand rule, decide whether the point d is above, below, or on the plane
 * @param {vec3} a First point on plane
 * @param {vec3} b Second point on plane
 * @param {vec3} c Third point on plane
 * @param {vec} d Test point
 * 
 * @return {int} 1 if d is above, -1 if d is below, 0 if d is on
 */
function getAboveOrBelow(a, b, c, d) {
    // TODO: Fill this in

	
	// calculate ab and ac
	let ab = vec3.create();
	let ac = vec3.create();
	vec3.subtract(ab, b, a); // ab = b - a
	vec3.subtract(ac, c, a); // ac = c - a

	// calculate normal vector :D
	let n = vec3.create();
	vec3.cross(n, ab, ac); // n = ab x ac

	// As a corner case, if the three points determining the plane are collinear, return -2
	if (vec3.length(n) === 0) {
		return -2;
	}

	// calculate ad
	let ad = vec3.create();
	vec3.subtract(ad, d, a); // ad = d - a

	let dotproductNAD = vec3.dot(n, ad);

	// determine if d above below on
	if (dotproductNAD > 0) {
		return 1;	// above
	} else if (dotproductNAD < 0) {
		return -1;	// below
	} else {
		return 0;	// onplane
	}

}







//////////////////////////////////////////////
///********         PART 2          *******///
//////////////////////////////////////////////




/**
 * Compute the barycentric coordinates of a point p with respect to a triangle /\abc
 * 
 * @param {vec3} a Point a on the triangle
 * @param {vec3} b Point b on the triangle
 * @param {vec3} c Point c on the triangle
 * @param {vec3} p The point whose barycentric coordinates we seek
 * 
 * @return {vec3} An vec3 with the barycentric coordinates (alpha, beta, gamma)
 * 				  corresponding to a, b, and c, respectively, so that
 * 				  alpha + beta + gamma = 1, and alpha, beta, gamma >= 0
 *          CORNER CASES:
 * 				  (1) If p is not inside of /\abc, then return [0, 0, 0]
 *          (2) If /\abc is zero area, then return [1, 0, 0] iff p = a (=b=c)
 *              otherwise, return [0, 0, 0]
 */
function getBarycentricCoords(a, b, c, p) {
	// TODO: Fill this in
	
		// get the tot area of triangle abc
		let AREA_abc = getTriangleArea(a, b, c);
	
		// (2) triangle case (zero area)
		if (AREA_abc === 0) {
			// iff p = a (=b=c), return [1, 0, 0]
			if (vec3.equals(a, p)) {
				return vec3.fromValues(1, 0, 0);
			}
			// otherwise, return [0, 0, 0] => (p is NOT inside triangle)
			return vec3.fromValues(0, 0, 0);
		}
	
		// get areas of sub-triangles
		let AREA_pbc = getTriangleArea(p, b, c);
		let AREA_apc = getTriangleArea(a, p, c);
		let AREA_abp = getTriangleArea(a, b, p);
	
		// get barycentric coordinates
		let alpha = AREA_pbc / AREA_abc;
		let beta = AREA_apc / AREA_abc;
		let gamma = AREA_abp / AREA_abc;
	
		// check if p is inside triangle => (λ1 + λ2 + λ3 = 1) ////////////////////////////
	
		// if λ1 or λ2 or λ3 >= 0, then p is either on triangle's edge or outside the triangle
		// if λ1 , λ2 , λ3 are positive, p is inside triangle
		if (alpha >= 0 && beta >= 0 && gamma >= 0 && Math.abs(alpha + beta + gamma - 1) < 1e-7) {
			return vec3.fromValues(alpha, beta, gamma);
		}
	
		// (1) if p is outside triangle, return [0, 0, 0]
		return vec3.fromValues(0, 0, 0);
	
		//return vec3.create();  //This is a dummy value!  Replace with your answer

}


/**
 * Find the intersection of a ray with a triangle
 * 
 * @param {vec3} p0 Endpoint of ray 
 * @param {vec3} v Direction of ray
 * @param {vec3} a Triangle vertex 1
 * @param {vec3} b Triangle vertex 2
 * @param {vec3} c Triangle vertex 3
 * 
 * @return {list} A list of vec3 objects.  The list should be empty
 *          if there is no intersection, or it should contain 
 *          exactly one vec3 object if there is an intersection
 *          CORNER CASES:
 *          (1) If the ray is parallel to the plane, 
*               return an empty list
 */
function rayIntersectTriangle(p0, v, a, b, c) {
	// TODO: Fill this in

		// calculate ab and ac
		let ab = vec3.create();
		let ac = vec3.create();
		vec3.subtract(ab, b, a); // ab = b - a
		vec3.subtract(ac, c, a); // ac = c - a
	
		// calculate normal vector :D
		let n = vec3.create();
		vec3.cross(n, ab, ac); // n = ab x ac
	
		// n * v = ?
		let nv = vec3.dot(n, v);
	
		// CHECK if ray || plane
		// when n = 0 => the ray is parallel to the plane
		if (Math.abs(nv) < 1e-7) {
			return []; // (1) If the ray || plane, return empty list              
		}
	
		// calculate t
		let ap = vec3.create();
		vec3.subtract(ap, a, p0); // ap = a - p0
		let t = vec3.dot(n, ap) / nv;
	
		// CHECK if ray is pointing wrong way
		if (t < 0) {
			return [];
		}
	
		// calculate intersection
		let res = vec3.create();
		vec3.scaleAndAdd(res, p0, v, t); // adds two vectors, p0 and v, after scaling the second operand, v, by a scalar value, t
	
		// CHECK if ray hits triangle inside triangle or on edges
		let baryCOORD = getBarycentricCoords(a, b, c, res);
		if (baryCOORD[0] >= 0 && baryCOORD[1] >= 0 && baryCOORD[2] >= 0 && 
			Math.abs(baryCOORD[0] + baryCOORD[1] + baryCOORD[2] - 1) < 1e-7) {
			return [res];
		}
	
		return []; //This is a dummy value!  Replace with your answer


}


/**
 * Find the intersection of the ray p0 + tv, t >= 0, with the
 * sphere centered at c with radius r.
 * 
 * @param {vec3} p0 Endpoint of the ray
 * @param {vec3} v Direction of the ray
 * @param {vec3} c Center of the sphere
 * @param {number} r Radius of the sphere
 * 
 * @return {list of vec3} A list of intersection points, 
 *   ***in the order in which the ray hits them***
 * If the ray doesn't hit any points, this list should be empty.
 * Note that a ray can hit at most 2 points on a sphere.
 */
function rayIntersectSphere(p0, v, c, r) {
	// TODO: Fill this in

	// getting a b c . . .
	let point_a = vec3.dot(v, v);

	let w = vec3.create();
	vec3.subtract(w, p0, c); // w = p0 - c

	let point_b = 2 * vec3.dot(w, v);
	let point_c = (vec3.dot(w, w)) - r * r;


	// (1) get discriminant and check it
	let discriminant = Math.pow(point_b, 2) - 4*point_a*point_c;

	// ray NEVER hits sphere // (2) ray pointing wrong way
	if (discriminant < 0) {
		return [];

	// (1) DOUBLE ROOT // ray has one intersect // tangent line
	} else if (discriminant === 0) {
		let t = -point_b / (2 * point_a);
		if (t >= 0) {
			let inter = vec3.create();
			vec3.scaleAndAdd(inter, p0, v, t); // inter = p0 + t * v
			return [inter];
		}
	
	// (discriminant > 0)
	} else {
		// when two roots // ray passes through sphere
		let sqrtDISC = Math.sqrt(discriminant);
		let t1 = (-point_b - sqrtDISC) / (2 * point_a);
		let t2 = (-point_b + sqrtDISC) / (2 * point_a);

		// both t points intersect
        if (t1 >= 0 && t2 >= 0) {
			//
            let inter1 = vec3.create();
            vec3.scaleAndAdd(inter1, p0, v, t1); // inter1 = p0 + t1 * v

            let inter2 = vec3.create();
            vec3.scaleAndAdd(inter2, p0, v, t2); // inter2 = p0 + t2 * v

            // check order: (t1 < t2)
            return (t1 < t2) ? [inter1, inter2] : [inter2, inter1];
		
		// (4) ray is inside the sphere
		// if t1 is the t_max
        } else if (t1 >= 0) {
            let inter1 = vec3.create();
            vec3.scaleAndAdd(inter1, p0, v, t1); // inter1 = p0 + t1 * v
            return [inter1];
		// if t2 is the t_max
        } else if (t2 >= 0) {
            let inter2 = vec3.create();
            vec3.scaleAndAdd(inter2, p0, v, t2); // inter2 = p0 + t2 * v
            return [inter2];
        }
        
        // t_min, t_max < 0
        return [];
    }

	//return []; //This is a dummy value!  Replace with your answer

}
