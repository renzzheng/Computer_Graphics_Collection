precision mediump float;

#define INF 1.0e+12
#define EPS 1.0e-3 // Reflect/shadow/transmission ray offset
#define MAX_RECURSION 3 // Maximum depth for rays
#define MAX_LIGHTS 10
#define MAX_MATERIALS 10
#define M_PI 3.1415926535897932384626433832795
#define MAX_SAMPLES 10

/*******************************************
                DATA TYPES
********************************************/
struct Material {
  vec3 kd;
  vec3 ks;
  vec3 ka;
  vec3 kt;
  float shininess;
  float refraction;
  int special;
};

struct Light {
    vec3 pos;
    vec3 color;
    vec3 atten;
    vec3 towards;
    float angle;
};

struct Ray {
  vec3 p0;
  vec3 v;
};

struct Intersection {
  vec3 p; // Point of intersection
  vec3 n; // Normal of intersection
  int mIdx; // Index into materials array
  float sCoeff; // Coefficient for checkerboard or special material
};


/*******************************************
                UNIFORMS
********************************************/
// Uniforms set from Javascript that are constant
// over all fragments
uniform int numLights;
uniform Light lights[MAX_LIGHTS];
uniform int numMaterials;
uniform Material materials[MAX_MATERIALS];
uniform int showLights;
uniform float beaconRadius;

// Ray tracer special options
uniform int orthographic;

// Camera parameters
uniform vec3 cameraPos;
uniform vec3 right;
uniform vec3 up;
uniform float fovx;
uniform float fovy;


/*******************************************
           RAY CASTING FUNCTIONS
********************************************/

// TODO: Put helper functions here if you'd like

//// get triangle area (HINT) It might be helpful to make a function that returns the area of a triangle spanned by three points
/**
 * Given three 3D vertices a, b, and c, compute the area 
 * of the triangle they span
 * @param {vec3} a First point
 * @param {vec3} b Second point
 * @param {vec3} c Third point
 * 
 * @return {float} Area of the triangle
 */
float getTriangleArea(vec3 a, vec3 b, vec3 c) {

	// calculate ab and ac (edge vectors)
    vec3 ab = b - a;
    vec3 ac = c - a;

    vec3 crossproduct = cross(ab, ac);
	float area = length(crossproduct) * 0.5;
	return area;

}



/**
* Given a point on a plane and a normal, intersect a ray
* with the plane they determine
*
* @param {Ray} ray : The ray in world coordinates
* @param {vec3} n : The plane normal
* @param {vec3} p : A point on the plane
* @param {int} mIdx : Array index of material that the plane is made of
* @param {Intersection (out)} intersect : The intersection
*
* @returns {float} t : Parameter t so that point of intersection is ray.p0 + t*ray.v
*/
float rayIntersectPlane(Ray ray, vec3 n, vec3 p, int mIdx, out Intersection intersect) {
    float denom = dot(ray.v, n);
    float t = INF;
    if (abs(denom) > 0.0) {
        // The ray is not parallel to the plane
        float num = dot(p - ray.p0, n);
        t = num / denom;
        if (t > 0.0) {
            // Plane is in front of ray
            intersect.p = ray.p0 + t*ray.v;
            intersect.n = n;
            intersect.mIdx = mIdx;
        }
        else {
            t = INF;
        }
    }
    return t;
}


/**
* Intersect a ray with a given triangle /\abc, assuming a, b, and c
* have been specified in CCW order with respect to the triangle normal
*
* @param {Ray} ray : The ray in world coordinates
* @param {vec3} a : Point a on the triangle
* @param {vec3} b : Point b on the triangle
* @param {vec3} c: Point c on the triangle
* @param {int} mIdx : Array index of material that the triangle is made of
* @param {mat4} MInv: Inverse of the transformation M that's applied to the triangle before ray intersection
* @param {mat3} N: The normal transformation associated to M
* @param {Intersection (out)} intersect : The intersection
*
* @returns {float} t : Parameter t so that point of intersection is ray.p0 + t*ray.v
*/
float rayIntersectTriangle(Ray ray, vec3 a, vec3 b, vec3 c,
                            int mIdx, mat4 MInv, mat3 N,
                            out Intersection intersect) {
    intersect.mIdx = mIdx; // Store away the material index


/** TODO: PUT YOUR CODE HERE **/
    // TODO: The below three are dummy values
    // intersect.p = vec3(0, 0, 0);
    // intersect.n = vec3(0, 0, 0);
    
    // transform ray to triangle's local space
    Ray localRay;
    localRay.p0 = vec3(MInv * vec4(ray.p0, 1.0));
    localRay.v = vec3(MInv * vec4(ray.v, 0.0));

    //// get intersection of the ray using traingle's plane

    // intersect the ray with triangle's plane
    vec3 planeN = normalize((cross(b-a, c-a)));
    float t = rayIntersectPlane(localRay, planeN, a, mIdx, intersect);

    if (t < 0.0 || t == INF) {
        return INF; // ray is parallel to plane
    }

    // get the intersection pt in obj-space
    vec3 p = localRay.p0 + t * localRay.v;

    //// check if intersect pt is inside triangle by using barycentriccoords
    float area_ABC = getTriangleArea(a, b, c);

    // get areas of sub-triangles
    float area_PBC = getTriangleArea(p, b, c);
    float area_APC = getTriangleArea(a, p, c);
    float area_ABP = getTriangleArea(a, b, p);

    // get barycentric coordinates
    float alpha = area_PBC / area_ABC;
    float beta = area_APC / area_ABC;
    float gamma = area_ABP / area_ABC;

    // check if pt is inside triangle
    if (alpha >= 0.0 && beta >= 0.0 && gamma >= 0.0 && abs(alpha + beta + gamma - 1.0) < 1e-5) {

        // return the intersection point and normal by reference (an "out" variable in GLSL) 
        intersect.mIdx = mIdx;                              
        intersect.p = vec3(ray.p0 + t * ray.v);
        intersect.n = normalize(N * planeN);

        // return t, the ray parameter of intersection
        return t;
    }

    // pt is outsdie the triangle
    return INF;
}


/**
* Intersect a ray with a given sphere
*
* @param {Ray} ray : The ray in world coordinates
* @param {vec3} c : Center of the sphere
* @param {float} r : Radius of the sphere
* @param {int} mIdx : Array index of material that the sphere is made of
* @param {mat4} MInv: Inverse of the transformation M that's applied to the sphere before ray intersection
* @param {mat3} N: The normal transformation associated to M
* @param {Intersection (out)} intersect : The intersection
*
* @returns {float} t : Parameter t so that point of intersection is ray.p0 + t*ray.v
*/
float rayIntersectSphere(Ray ray, vec3 c, float r,
                            int mIdx, mat4 MInv, mat3 N,
                            out Intersection intersect) {
    intersect.mIdx = mIdx; // Store away the material index

/** TODO: PUT YOUR CODE HERE **/
    // TODO: The below three are dummy values
    // intersect.p = vec3(0, 0, 0);
    // intersect.n = vec3(0, 0, 0);
    // intersect.sCoeff = 1.0; // TODO: Change this for special material extra task

    // transform ray to sphere's local space
    Ray localRay;
    localRay.p0 = vec3(MInv * vec4(ray.p0, 1.0));
    localRay.v = vec3(MInv * vec4(ray.v, 0.0));

    //// quadratic 
    // get coefficients for quadratic eq (a b c)
    vec3 rad = localRay.p0 - c;
    float co_a = dot(localRay.v, localRay.v); 
    float co_b = 2.0 * dot(rad, localRay.v);
    float co_c = dot(rad, rad) - r * r;

    // get discriminant and check it
    float discriminant = co_b * co_b - 4.0 * co_a * co_c;
    if (discriminant < 0.0) {
        return INF; // line never hits sphere
    }

    // get both roots t1 t2
    float sqrtDisc = sqrt(discriminant);
    float t1 = (-co_b - sqrtDisc) / (2.0 * co_a);
    float t2 = (-co_b + sqrtDisc) / (2.0 * co_a);

    // make sure t1 is the smaller non-negative root
    float t = (t1 > 0.0) ? t1 : t2;
    if (t < 0.0) {
        return INF; // both roots are negative
    }

    // get local intersection pt
    vec3 p = localRay.p0 + t * localRay.v;
    // transform the intersection point back to world space
    intersect.p = vec3(ray.p0 + t * ray.v);

    // get normal at local and world
    vec3 normal = normalize(p - c);
    intersect.n = normalize(N * normal);

    intersect.mIdx = mIdx;

    //// get checkerboard pattern
    vec3 localN = vec3(normal.x, normal.y, normal.z);
    vec3 worldN = vec3(intersect.n.x, intersect.n.y, intersect.n.z);

    // then let
    float phi = acos(worldN.y); // elevation
    // and
    float theta = atan(worldN.z, worldN.x); // azimuth
    // then you can take
    float n = 9.0;
    float egg = cos(n * phi) * cos(n * theta);

    // number to be added on as a term in front of diffuse term kd
    intersect.sCoeff = (egg > 0.0) ? 1.0 : 0.0;

    // will return t, the ray paramterer of intersection
    return t;
}


/**
* Intersect a ray with a (possibly transformed) box, whose extent
* in untransformed space is [center[0]-width/2, center[0]+width/2],
*                           [center[1]-height/2, center[1]+height/2],
*                           [center[2]-length/2, center[2]+length/2]
*
* @param {Ray} ray : The ray in world coordinates
* @param {float} W : Extent of the box along the x dimension
* @param {float} H : Extent of the box along the y dimension
* @param {float} L : Extent of the box along the z dimension
* @param {vec3} c : Center of the box
* @param {int} mIdx : Array index of material that the box is made of
* @param {mat4} MInv: Inverse of the transformation M that's applied to the box before ray intersection
* @param {mat3} N: The normal transformation associated to M
* @param {Intersection (out)} intersect : The intersection
*
* @returns {float} t : Parameter t so that point of intersection is ray.p0 + t*ray.v
*/
float rayIntersectBox(Ray ray, float W, float H, float L,
                        vec3 c, int mIdx, mat4 MInv, mat3 N,
                        out Intersection intersect) {
    intersect.mIdx = mIdx; // Store away the material index

/** TODO: PUT YOUR CODE HERE **/
    // TODO: The below three are dummy values
    // intersect.p = vec3(0, 0, 0);
    // intersect.n = vec3(0, 0, 0);
    // intersect.sCoeff = 1.0; // TODO: Change this for special material extra task

    // transform ray to box's local space
    Ray localRay;
    localRay.p0 = vec3(MInv * vec4(ray.p0, 1.0));
    localRay.v = vec3(MInv * vec4(ray.v, 0.0));

    Intersection intersectNew;

    // closest intersection t = ∞
    float tMin = INF;
    vec3 p;
    vec3 normal;

    // box boundaries
    vec3 Bmin = c - vec3(W, H, L) * 0.5;
    vec3 Bmax = c + vec3(W, H, L) * 0.5;

    float n = 9.0;

    // front face
    float t = rayIntersectPlane(localRay, vec3(0.0, 0.0, 1.0), Bmax, mIdx, intersectNew);
    if (t != INF && intersectNew.p.x >= Bmin.x && intersectNew.p.x <= Bmax.x && intersectNew.p.y >= Bmin.y && intersectNew.p.y <= Bmax.y) {
        if (t < tMin) {
            tMin = t;
            p = intersectNew.p;
            normal = intersectNew.n;

            // checkerboard pattern
            float x = p.x / Bmax.x;
            float y = p.y / Bmax.y;

            float checkers = cos(n*x) * cos(n*y);
            intersect.sCoeff = (checkers > 0.0) ? 1.0 : 0.0;
        }
    }

    // rear face
    t = rayIntersectPlane(localRay, vec3(0.0, 0.0, -1.0), Bmin, mIdx, intersectNew);
    if (t != INF && intersectNew.p.x >= Bmin.x && intersectNew.p.x <= Bmax.x && intersectNew.p.y >= Bmin.y && intersectNew.p.y <= Bmax.y) {
        if (t < tMin) {
            tMin = t;
            p = intersectNew.p;
            normal = intersectNew.n;

            // checkerboard pattern
            float x = p.x / Bmin.x;
            float y = p.y / Bmin.y;

            float checkers = cos(n*x) * cos(n*y);
            intersect.sCoeff = (checkers > 0.0) ? 1.0 : 0.0;
        }
    }

    // right face
    t = rayIntersectPlane(localRay, vec3(1.0, 0.0, 0.0), Bmax, mIdx, intersectNew);
    if (t != INF && intersectNew.p.z >= Bmin.z && intersectNew.p.z <= Bmax.z && intersectNew.p.y >= Bmin.y && intersectNew.p.y <= Bmax.y) {
        if (t < tMin) {
            tMin = t;
            p = intersectNew.p;
            normal = intersectNew.n;

            // checkerboard pattern
            float x = p.z / Bmax.x;
            float y = p.y / Bmax.y;

            float checkers = cos(n*x) * cos(n*y);
            intersect.sCoeff = (checkers < 0.0) ? 1.0 : 0.0;
        }
    }

    // left face
    t = rayIntersectPlane(localRay, vec3(-1.0, 0.0, 0.0), Bmin, mIdx, intersectNew);
    if (t != INF && intersectNew.p.z >= Bmin.z && intersectNew.p.z <= Bmax.z && intersectNew.p.y >= Bmin.y && intersectNew.p.y <= Bmax.y) {
        if (t < tMin) {
            tMin = t;
            p = intersectNew.p;
            normal = intersectNew.n;

            // checkerboard pattern
            float x = p.z / Bmin.x;
            float y = p.y / Bmin.y;

            float checkers = cos(n*x) * cos(n*y);
            intersect.sCoeff = (checkers < 0.0) ? 1.0 : 0.0;
        }
    }

    // top face
    t = rayIntersectPlane(localRay, vec3(0.0, 1.0, 0.0), Bmax, mIdx, intersectNew);
    if (t != INF && intersectNew.p.x >= Bmin.x && intersectNew.p.x <= Bmax.x && intersectNew.p.z >= Bmin.z && intersectNew.p.z <= Bmax.z) {
        if (t < tMin) {
            tMin = t;
            p = intersectNew.p;
            normal = intersectNew.n;

            // checkerboard pattern
            float x = p.z / Bmax.x;
            float y = p.x / Bmax.y;

            float checkers = cos(n*x) * cos(n*y);
            intersect.sCoeff = (checkers > 0.0) ? 1.0 : 0.0;
        }
    }

    // bottom face
    t = rayIntersectPlane(localRay, vec3(0.0, -1.0, 0.0), Bmin, mIdx, intersectNew);
    if (t != INF && intersectNew.p.x >= Bmin.x && intersectNew.p.x <= Bmax.x && intersectNew.p.z >= Bmin.z && intersectNew.p.z <= Bmax.z) {
        if (t < tMin) {
            tMin = t;
            p = intersectNew.p;
            normal = intersectNew.n;

            // checkerboard pattern
            float x = p.z / Bmin.x;
            float y = p.x / Bmin.y;

            float checkers = cos(n*x) * cos(n*y);
            intersect.sCoeff = (checkers > 0.0) ? 1.0 : 0.0;
        }
    }

    // return the intersection point and normal by reference (an "out" variable in GLSL)
    intersect.p = vec3(ray.p0 + tMin * ray.v);
    intersect.n = normalize(N * normal);

    //intersect.sCoeff = 1.0;

    // return t, the ray parameter of intersection
    return tMin;
}

float rayIntersectBox2(Ray worldray, float W, float H, float L, 
                        vec3 c, int mIdx, mat4 MInv, mat3 N, 
                        out Intersection intersect) {
    intersect.mIdx = mIdx; // Store away the material index
    // BEGIN MY CODE
    float t = INF;
    float tCurr;
    Intersection intersectCurr;
    
    Ray ray;
    ray.p0 = (MInv*vec4(worldray.p0, 1.0)).xyz;
    ray.v = (MInv*vec4(worldray.v, 0.0)).xyz;

    vec3 p;
    vec3 p0 = vec3(c.x-W/2.0, c.y+H/2.0, c.z+L/2.0);

    //Front face
    tCurr = rayIntersectPlane(ray, vec3(0.0, 0.0, -1.0), p0, mIdx, intersectCurr);
    if (tCurr < t) {
        p = ray.p0 + tCurr*ray.v;
        if (abs(p.x-c.x) < W/2.0 && abs(p.y-c.y) < H/2.0) {
            intersect = intersectCurr;
            t = tCurr;
        }
    }
    //Left face
    tCurr = rayIntersectPlane(ray, vec3(-1.0, 0.0, 0.0), p0, mIdx, intersectCurr);
    if (tCurr < t) {
        p = ray.p0 + tCurr*ray.v;
        if (abs(p.z-c.z) < L/2.0 && abs(p.y-c.y) < H/2.0) {
            intersect = intersectCurr;
            t = tCurr;
        }
    }
    // Top face
    tCurr = rayIntersectPlane(ray, vec3(0.0, 1.0, 0.0), p0, mIdx, intersectCurr);
    if (tCurr < t) {
        p = ray.p0 + tCurr*ray.v;
        if (abs(p.x-c.x) < W/2.0 && abs(p.z-c.z) < L/2.0) {
            intersect = intersectCurr;
            t = tCurr;
        }
    }

    p0 = vec3(c.x+W/2.0, c.y-H/2.0, c.z-L/2.0);
    //Back face
    tCurr = rayIntersectPlane(ray, vec3(0.0, 0.0, 1.0), p0, mIdx, intersectCurr);
    if (tCurr < t) {
        p = ray.p0 + tCurr*ray.v;
        if (abs(p.x-c.x) < W/2.0 && abs(p.y-c.y) < H/2.0) {
            intersect = intersectCurr;
            t = tCurr;
        }
    }
    //Right face
    tCurr = rayIntersectPlane(ray, vec3(1.0, 0.0, 0.0), p0, mIdx, intersectCurr);
    if (tCurr < t) {
        p = ray.p0 + tCurr*ray.v;
        if (abs(p.z-c.z) < L/2.0 && abs(p.y-c.y) < H/2.0) {
            intersect = intersectCurr;
            t = tCurr;
        }
    }
    // Bottom face
    tCurr = rayIntersectPlane(ray, vec3(0.0, -1.0, 0.0), p0, mIdx, intersectCurr);
    if (tCurr < t) {
        p = ray.p0 + tCurr*ray.v;
        if (abs(p.x-c.x) < W/2.0 && abs(p.z-c.z) < L/2.0) {
            intersect = intersectCurr;
            t = tCurr;
        }
    }

    intersect.p = vec3(ray.p0 + t * ray.v);
    intersect.n = normalize(N * intersect.n);
    
    return t;
}

/**
* Intersect a ray with a given cylinder
*
* @param {Ray} ray : The ray in world coordinates
* @param {vec3} c : Center of cylinder
* @param {float} r : Radius of cylinder
* @param {float} h : Height of cylinder
* @param {int} mIdx : Array index of material that the cylinder is made of
* @param {mat4} MInv: Inverse of the transformation M that's applied to the cylinder before ray intersection
* @param {mat3} N: The normal transformation associated to M
* @param {Intersection (out)} intersect : The intersection
*
* @returns {float} t : Parameter t so that point of intersection is ray.p0 + t*ray.v
*/
float rayIntersectCylinder(Ray ray, vec3 c, float r, float h,
                            int mIdx, mat4 MInv, mat3 N,
                            out Intersection intersect) {
    intersect.mIdx = mIdx; // Store away the material index
    intersect.sCoeff = 1.0; // TODO: Change this for special material extra task
/** TODO: PUT YOUR CODE HERE **/
    // TODO: The below three are dummy values
    // intersect.p = vec3(0, 0, 0);
    // intersect.n = vec3(0, 0, 0);
    //return INF;

    //// (1) transform cylinder's ray into local space
    Ray localRay;
    localRay.p0 = vec3(MInv * vec4(ray.p0, 1.0));
    localRay.v = vec3(MInv * vec4(ray.v, 0.0));
    vec3 p0 = localRay.p0;
    vec3 v = localRay.v;

    //// quadratic
    // solve quadratic equation for the cylinder surface in XZ-plane (ignoring y-axis)
    // like sphere but without y-axis ?
    //vec3 rad = vec3(p0.x - c.x, 0.0, p0.z - c.z)
    // include the center portions in the coefficients
    float a_co = v.x*v.x + v.z*v.z; // x^2 + z^2 = r^2
    float b_co = 2.0 * (p0.x*v.x + p0.z*v.z - c.x*v.x - c.z*v.z);
    float c_co = (p0.x - c.x)*(p0.x - c.x) + (p0.z - c.z)*(p0.z - c.z) - r*r;

    // get and check discriminant
    float discriminant = b_co * b_co - 4.0 * a_co * c_co;
    if (discriminant < 0.0) {
        return INF; // no intersect
    }

    // get roots t1 and t2
    float sqrtDisc = sqrt(discriminant);
    float t1New = (-b_co - sqrtDisc) / (2.0 * a_co);
    float t2New = (-b_co + sqrtDisc) / (2.0 * a_co);

    // Also, when calculating what t is, 
    // divide the t between the projected ray and circle 
    // by the cosine of the angle between the original ray and the XZ plane
    // to get the correct value (effectively un-doing the projection).
    float cosTheta = 1.0; // replace later
    float t1 = t1New / cosTheta;
    float t2 = t2New / cosTheta;

    float t = INF;

    // check for the intersection with the side of the cylinder
    float y1 = p0.y + t1 * v.y;
    if (y1 >= -h / 2.0 && y1 <= h / 2.0 && t1 > 0.0) {
        t = min(t, t1);
    }
    float y2 = p0.y + t2 * v.y;
    if (y2 >= -h / 2.0 && y2 <= h / 2.0 && t2 > 0.0) {
        t = min(t, t2);
    }

    // check bottom circle for intersection
    float tBottom = (-h / 2.0 - p0.y) / v.y;
    vec3 pBottom = p0 + tBottom * v;
    if (tBottom > 0.0 && length(pBottom.xz) <= r) {
        t = min(t, tBottom);
        intersect.p = vec3(ray.p0 + t * ray.v);
        intersect.n = vec3(0.0, -1.0, 0.0); // intersection occurs at top circle
    }

    // check top circle for intersection
    float tTop = (h / 2.0 - p0.y) / v.y;
    vec3 pTop = p0 + tTop * v;
    if (tTop > 0.0 && length(pTop.xz) <= r) {
        t = min(t, tTop);
        intersect.p = vec3(ray.p0 + t * ray.v);
        intersect.n = vec3(0.0, 1.0, 0.0); // intersection occurs at bottom circle
    }

    // check intersection with the side of the cylinder
    if (t == t1 || t == t2) {
        vec3 p = p0 + t * v;
        vec3 n = normalize(vec3(p.x - c.x, 0.0, p.z - c.z));
        intersect.p = vec3(ray.p0 + t * ray.v);
        intersect.n = normalize(N * n);
    }

    return t;
}


/**
* Intersect a ray with a given cone
*
* @param {Ray} ray : The ray in world coordinates
* @param {vec3} c : Center of cone
* @param {float} r : Radius of cone
* @param {float} h : Height of cone
* @param {int} mIdx : Array index of material that the cone is made of
* @param {mat4} MInv: Inverse of the transformation M that's applied to the cone before ray intersection
* @param {mat3} N: The normal transformation associated to M
* @param {Intersection (out)} intersect : The intersection
*
* @returns {float} t : Parameter t so that point of intersection is ray.p0 + t*ray.v
*/
float rayIntersectCone(Ray ray, vec3 c, float r, float h,
                            int mIdx, mat4 MInv, mat3 N,
                            out Intersection intersect) {
    intersect.mIdx = mIdx; // Store away the material index
    intersect.sCoeff = 1.0; // TODO: Change this for special material extra task
/** TODO: PUT YOUR CODE HERE **/
    // TODO: The below three are dummy values
    // intersect.p = vec3(0, 0, 0);
    // intersect.n = vec3(0, 0, 0);
    return INF;

    //// (1) transform cone's ray into local space
    Ray localRay;
    localRay.p0 = vec3(MInv * vec4(ray.p0, 1.0));
    localRay.v = normalize(vec3(MInv * vec4(ray.v, 0.0)));

    vec3 p0 = localRay.p0;
    vec3 v = localRay.v;

    // check if the ray origin is below the cone's bottom circle (y = 0)
    if (p0.y < 0.0) {
        // check for intersection with the bottom circle of the cone (a cylinder)
        float dist = p0.x * p0.x + p0.z * p0.z;
        if (dist <= r * r) {
            intersect.p = p0;
            intersect.n = vec3(0.0, -1.0, 0.0); // ray intersects bottom circle so normal = (0, -1, 0)
            return 0.0; // intersection at t = 0
        } else {
            return INF; // no intersection
        }
    }

    // // get the cone's scaling factor k = r / h
    // float k = r / h;
    // float k2 = k * k;

    // // get the quadratic coefficients
    // float yk = p0.y - h; // y0 - yend
    // float a_co = v.x*v.x + v.z*v.z - k2 *v.y*v.y;
    // float b_co = 2.0 * (p0.x*v.x + p0.z*v.z - c.y*k2*yk*v.y);
    // float c_co = (p0.x -c.x) * (p0.x - c.x) + (p0.z -c.z) * (p0.z - c.z * k2 * yk * yk);

    // // get the discriminant
    // float discriminant = b_co * b_co - 4.0 * a_co * c_co;
    // if (discriminant < 0.0) return INF; // no intersect

    // // get roots t1 and t2
    // float sqrtD = sqrt(discriminant);
    // float t1 = (-b_co - sqrtD) / (2.0 * a_co);
    // float t2 = (-b_co + sqrtD) / (2.0 * a_co);

    // // check t1 is the smaller non-negative root
    // float t = (t1 > 0.0) ? t1 : t2;
    // if (t < 0.0) {
    //     return INF; // both roots are negative
    // }

    // // get the intersection point in object space
    // vec3 p = localRay.p0 + t * localRay.v;

    // // check if intersection is within the cone's height
    // if (p.y < 0.0 || p.y > h) return INF;

    // // get normal
    // vec3 n = normalize(vec3(2.0 * (p.x - c.x), -2.0 * k2 * (p.y - c.y), 2.0 * (p.z - c.z)));

    // intersect.p = vec3(ray.p0 + t * ray.v);
    // intersect.n = normalize(N * n);

    // return t;
}


/**
* A function which intersects a ray with a scene, returning the
* t parameter of the closest intersection, or INF if no intersection
* happened, along with an out parameter storing the point, normal,
* and material of the intersection
* NOTE: This function is merely declared here; it is defined in its
* entirety in Javascript before this shader is compiled, since information
* about the scene must be hardcoded into the shader
*
* @param {Ray} ray : The ray in world coordinates
* @param {Intersection (out)} intersect : The intersection
*
* @returns {float} t : Parameter t so that point of intersection is ray.p0 + t*ray.v
*/
float rayIntersectScene(Ray ray, out Intersection intersect){return INF;}


/*******************************************
        RAY ILLUMINATION FUNCTIONS
********************************************/

/**
* Pull a material out of the list of materials, based on its
* index.  This function is necessary, because it is not possible
* to use non-constant indices into arrays in GLSL, so one must
* loop over the entire array of materials to find the right one
*
* @param {int} mIdx : The index into the materials array of the
*                     material we seekd
*
* @returns {Material} m : The appropriate material struct
*/
Material getMaterial(int mIdx) {
    Material m;
    for (int i = 0; i < MAX_MATERIALS; i++) {
        if (i == mIdx) {
            m = materials[i];
        }
        if (i >= numMaterials) {
            break;
        }
    }
    return m;
}

///// SOFT SHADOWS /////

// random generator from website link
float random (vec2 st) {
    return fract(sin(dot(st.xy,vec2(12.9898,78.233)))* 43758.5453123);
}

float softShadow(Intersection intersect, Light l) {

    // get the direction vector from intersection pt to light
    vec3 L = l.pos - intersect.p;
    vec3 d = normalize(L);
    // vec2 st = gl_FragCoord.xy/u_resolution.xy;

    float shadowScale = 0.0;
    int samples = MAX_SAMPLES;

    // loop to get shadow smaples
    for (int i = 0; i < MAX_SAMPLES; ++i) {

        // random spherical coordinates
        float theta = random(vec2(float(i), intersect.p.x));
        float phi = random(vec2(float(i+1), intersect.p.y));

        // spherical to cartesian
        float x = beaconRadius * sin(phi) * cos(theta);
        float y = beaconRadius * sin(phi) * sin(theta);
        float z = beaconRadius * cos(phi);

        // create random vectors
        vec3 pos = l.pos + vec3(x,y,z);
        vec3 direction = normalize(pos - intersect.p);

        // make a ray from intersection point in direction of the light
        Ray shadow;
        shadow.p0 = intersect.p + EPS * d;
        shadow.v = direction;

        // check t for collisions
        Intersection shadowI;
        float t = rayIntersectScene(shadow, shadowI);

        // place shadow if collision t happens before intersection
        if (t < length(pos - intersect.p)) shadowScale += 1.0;

    }

    return 1.0 - shadowScale / float(samples);
}

/**
* Determine whether a point is in the shadow of a light
*
* @param {Intersection} intersect : Intersection point we're checking
* @param {int} lightIndex : Index into the array of lights of
*                           the light we want to check
*/
bool pointInShadow(Intersection intersect, Light l) {

    //return false;

    // get the direction vector from intersection pt to light
    vec3 L = l.pos - intersect.p;

    // (tip) add EPS times direction vector to the initial pt on ray
    vec3 p0 = intersect.p + EPS * normalize(L);

    // make a ray from intersection point in direction of the light
    Ray shadow;
    shadow.p0 = p0;
    shadow.v = L;

    // check t for collisions
    float t = rayIntersectScene(shadow, intersect);

    return (t < 1.0); // true that pt is in shadow

}

/**
* Get the phong illumination color
*/
vec3 getPhongColor(Intersection intersect, Material m, vec3 eye) {
    vec3 color = vec3(0.0, 0.0, 0.0);
    // To help with debugging, color the fragment based on the
    // normal of the intersection.  But this should eventually
    // be replaced with code to do Phong illumination below
    //color = 0.5*(intersect.n + 1.0);

/** TODO: PUT YOUR CODE HERE **/
    // loop through lights in scene, up to MAX_LIGHTS
    for (int i = 0; i < MAX_LIGHTS; ++i) {
        if (i >= numLights) break;  // break out of loop before you reach numLights

        Light l = lights[i];        // index through unifrom list lights

        // normal of intersection pt
        vec3 N = normalize(intersect.n);

        //// get the ci (light with attenuation) value
        vec3 I0 = l.color;
        float d = length(l.pos - intersect.p);
        float ca = l.atten.x;
        float la = l.atten.y;
        float qa = l.atten.z;
        float attenuation = (ca + la*d + qa*d*d);
        vec3 ci = I0 / attenuation;

        //// diffuse coefficient
        vec3 LVec = normalize(l.pos - intersect.p);    // light direction / unit vector from vertex to light
        
        // spotlight angle
        float cosTheta = dot(LVec, normalize(-l.towards));
        if (cosTheta < cos(l.angle)) {
            continue; // outside spotlight
        }

        float kdCoeff = (dot(N, LVec)); // clamp it
        if (kdCoeff < 0.0) {
            kdCoeff = 0.0;
        }

        //// specular coefficient
        vec3 dh = normalize(reflect(-LVec, N));
        vec3 H = normalize(eye - intersect.p);
        //vec3 H = normalize(LVec + normalize(eye - intersect.p));
        float ksCoeff = (dot(H, dh)); // clamp it
        if (ksCoeff < 0.0) {
            ksCoeff = 0.0;
        }

        // phong spec
        ksCoeff = pow(ksCoeff, m.shininess);

        // check if the point is in shadow
        //float si = pointInShadow(intersect, l) ? 0.0 : 1.0;

        // soft shadow check
        float si = softShadow(intersect, lights[i]);

        //// checkerboard pattern
        vec3 new_kd = m.kd;
        // check if special flag of material is 1
        if (m.special == 1) {
            new_kd *= intersect.sCoeff;
        }

        //// final colour equation
        vec3 ambient = m.ka;
        vec3 diffuse = si * kdCoeff * new_kd * ci;
        vec3 specular = si * ksCoeff * m.ks * ci;

        color += ambient + diffuse + specular;

    }

    return color;  // final colour
}


/**
*
*/
varying vec2 v_position;
Ray getRay() {
    Ray ray;
    ray.p0 = cameraPos;
    // TODO: Finish constructing ray by figuring out direction, using
    // v_position.x, v_position.y, fovx, fovy, up, and right
    if (orthographic == 1) {
        // TODO: Fill in code for constructing orthographic rays
        // (You can ignore this if you aren't doing the orthographic extra task)

        vec3 toward = normalize(cross(up, right));

        vec3 scaleRight = right * v_position.x;
        vec3 scaleUp = up * v_position.y;

        ray.p0 += scaleRight + scaleUp;
        ray.v = toward;

    }
    else {
        // TODO: Fill in ordinary perspective ray based on fovx and fovy (the default option)

        // get the orthongonal to up and right vectors
        vec3 towards = normalize(cross(up, right));

        vec3 scaleRight = right * tan(fovx / 2.0) * v_position.x;
        vec3 scaleUp = up * tan(fovy / 2.0) * v_position.y;

        // normalize to get ray direction's unit vector
        ray.v = normalize(towards + scaleRight + scaleUp);

    }
    return ray;
}

void showLightBeacons(Ray rayInitial, float tInitial) {
    // Show light beacons if the user so chooses
    // (NOTE: This requires a working implementation of rayIntersectSphere)
    mat4 identity4 = mat4(1.0);
    mat3 identity3 = mat3(1.0);
    Intersection intersect;
    if (showLights == 1) {
        for (int i = 0; i < MAX_LIGHTS; i++) {
            if (i < numLights) {
                Light light = lights[i];
                float tlight = rayIntersectSphere(rayInitial, light.pos, beaconRadius,
                                                  0, identity4, identity3, intersect);
                if (tlight < tInitial) {
                    gl_FragColor = vec4(light.color, 1.0);
                }
            }
        }
    }
}

void main() {
    Ray ray = getRay();
    Ray rayInitial = ray;
    bool insideObj = false;
    Intersection intersect;
    intersect.sCoeff = 1.0;
    vec3 color = vec3(0.0, 0.0, 0.0);
    vec3 weight = vec3(1.0, 1.0, 1.0);
    float t;
    float tInitial;
    for (int depth = 0; depth < MAX_RECURSION; depth++) {
        t = rayIntersectScene(ray, intersect);
        if (depth == 0) {
            tInitial = t;
        }
        if (t < INF) {
            Material m = getMaterial(intersect.mIdx);
            // Figure out whether the ray is inside the object it
            // intersected by using the dot product between a vector
            // from the endpoint of the ray and the intersection
            // point and the intersection normal
            if (dot(ray.p0 - intersect.p, intersect.n) < 0.0) {
                intersect.n *= -1.0;
                insideObj = true;
            }
            else {
                insideObj = false;
            }
            
            // adds phong shading (was originally here btw)
            color += weight*getPhongColor(intersect, m, rayInitial.p0);
            
            // TODO: Reflect ray, multiply weight by specular of this object,
            // and recursively continue
            // If doing extra task on transmission, only reflect if the
            // transmission coefficient kt is zero in all components
            // Otherwise, do transmission with snell's law

            // reflect ray if ks > 0 (specular)
            if (m.ks != vec3(0.0,0.0,0.0)) {
                // get the reflected ray direction
                vec3 rDirection = reflect(ray.v, intersect.n);
                vec3 r0 = intersect.p + EPS * rDirection;

                ray.p0 = r0;
                ray.v = rDirection;

                // update the weight, scaling by ks
                weight *= m.ks;
            }
            else {
                // no reflection
                break;
            }

/** TODO: PUT YOUR CODE HERE **/
        }
        else {
            // Ray doesn't intersect anything, so no use continuing
            break;
        }
    }
    gl_FragColor = vec4(color, 1.0);
    showLightBeacons(rayInitial, tInitial);
}
