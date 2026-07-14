precision mediump float;

const float BLUR_SUPPORT = 0.05;
const float BLUR_INC = 0.005;

// The 2D position of the pixel in this fragment, interpolated via
// barycentric coordinates from positions of triangle vertices
varying vec2 v_position;
// The 2D texture coordinate in this fragment, interpolated via
// barycentric coordinates from positions of triangle vertices
varying highp vec2 v_texture;

uniform sampler2D uSampler;

uniform float uSigmar; // σr = 0.2
uniform float uSigmad; // σd = 0.05

/**
 * Compute the intensity of a color pixel
 * @param rgba The red, green, blue, alpha describing the pixel
 */
float getIntensity(vec4 rgba) {
    return 0.2125*rgba[0] + 0.7154*rgba[1] + 0.0721*rgba[2];
}

void main() {
    float x1 = v_texture.x;
    float y1 = v_texture.y;
    vec4 I1 = texture2D(uSampler, vec2(x1, y1));
    //gl_FragColor = I1; // TODO: This is a placeholder

    // accumulators
    vec3 intensitySum = vec3(0.0);  // stores the weighted vectors sum of the pixels in a neighborhood
    float weightSum = 0.0;          // stores the sum of the weights

    for (float dx = -BLUR_SUPPORT; dx <= BLUR_SUPPORT; dx += BLUR_INC) {
        for (float dy = -BLUR_SUPPORT; dy <= BLUR_SUPPORT; dy += BLUR_INC) {

            // neight pixel pos
            float x2 = x1 + dx;
            float y2 = y1 + dy;
            vec4 I2 = texture2D(uSampler, vec2(x2, y2));

            // TODO: Fill this in to implement a bilateral filter ////////

            // gets spatial distance weight
            //float spatialDist = ((x2 - x1)*(x2 - x1) + (y2 - y1)*(y2 - y1));
            float spatialDist = dx * dx + dy * dy;
            float spatialWeight = exp(-spatialDist / (2.0 * uSigmad*uSigmad));

            // gets color difference weight
            float colorDist = dot((I1.rgb - I2.rgb), (I1.rgb - I2.rgb));
            float colorWeight = exp(- colorDist / (2.0 * uSigmar*uSigmar));

            // get e^weight * e^weight
            float weight = spatialWeight * colorWeight;

            // summate weighted color and weight sums
            intensitySum += I2.rgb * weight; // weighted avg of surrounding pixels
            weightSum += weight;

        }
    }

    // divide the accumulated color sum by the total weight sum after the loop
    vec3 finalSum = intensitySum / weightSum;

    gl_FragColor = vec4(finalSum, 1.0);
    //gl_FragColor[3] = 1.0;
}
