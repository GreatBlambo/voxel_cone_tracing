#version 450 core

in GS_OUT 
{
  vec4 world_position;
  vec3 normal;
  vec2 uv;
} gs_out;

layout (std140, binding = 1) uniform material
{
  vec3 ambient;
  vec3 diffuse;
  vec3 specular;
  vec3 transmittance;
  vec3 emission;

  float shininess;
  float ior;
  float dissolve;

  int illum;

  float roughness;
  float metallic;
  float sheen;
  float clearcoat_thickness;
  float clearcoat_roughness;
  float anisotropy;
  float anisotropy_rotation;
};

struct point_light
{
  vec3 position;
  vec3 color;
  float intensity;
};

#define MAX_POINT_LIGHTS 10
uniform point_light point_lights[MAX_POINT_LIGHTS];
uniform int point_light_count;

uniform layout (binding = 2, r32ui) uimage3D tex3D[6];

vec3 scale_and_bias(const vec3 p)
{
  return 0.5f * p + vec3(0.5f);
}

bool within_cube(const vec3 p, float error)
{
  return abs(p.x) < 1 + error && abs(p.y) < 1 + error && abs(p.z) < 1 + error;
}

float attenuate(float k, float l, float q, float d)
{
  return 1.0f / (k + l * d + q * d * d);
}

uniform float cube_size;

// Note: below functions relating to storing an atomic running average are courtesy of the OpenGL
// Insights chapter on hardware accelerated voxelization

uint convVec4ToRGBA8(vec4 val) {
  return (uint(val.w) & 0x000000FF) << 24U
    | (uint(val.z) & 0x000000FF) << 16U
    | (uint(val.y) & 0x000000FF) << 8U
    | (uint(val.x) & 0x000000FF);
}

vec4 convRGBA8ToVec4(uint val) {
  return vec4(float((val & 0x000000FF)),
      float((val & 0x0000FF00) >> 8U),
      float((val & 0x00FF0000) >> 16U),
      float((val & 0xFF000000) >> 24U));
}

uint encUnsignedNibble(uint m, uint n) {
  return (m & 0xFEFEFEFE)
    | (n & 0x00000001)
    | (n & 0x00000002) << 7U
    | (n & 0x00000004) << 14U
    | (n & 0x00000008) << 21U;
}

uint decUnsignedNibble(uint m) {
  return (m & 0x00000001)
    | (m & 0x00000100) >> 7U
    | (m & 0x00010000) >> 14U
    | (m & 0x01000000) >> 21U;
}

void imageAtomicRGBA8Avg(layout (r32ui) uimage3D img, ivec3 coords, vec4 val)
{
  // LSBs are used for the sample counter of the moving average.

  val *= 255.0;
  uint newVal = encUnsignedNibble(convVec4ToRGBA8(val), 1);
  uint prevStoredVal = 0;
  uint currStoredVal;

  int counter = 0;
  // Loop as long as destination value gets changed by other threads
  while ((currStoredVal = imageAtomicCompSwap(img, coords, prevStoredVal, newVal))
      != prevStoredVal && counter < 16) {

    vec4 rval = convRGBA8ToVec4(currStoredVal & 0xFEFEFEFE);
    uint n = decUnsignedNibble(currStoredVal);
    rval = rval * n + val;
    rval /= ++n;
    rval = round(rval / 2) * 2;
    newVal = encUnsignedNibble(convVec4ToRGBA8(rval), n);

    prevStoredVal = currStoredVal;

    counter++;
  }
}

void main()
{
  vec3 pos = gs_out.world_position.xyz;
  vec3 color = vec3(0.0f);

  // Calculate lighting
  int num_lights = min(point_light_count, MAX_POINT_LIGHTS);
  for (int i = 0; i < num_lights; i++)
  {
    const vec3 light_pos = point_lights[i].position / cube_size;
    const vec3 dir = normalize(light_pos - gs_out.world_position.xyz);
    const float d = distance(light_pos, gs_out.world_position.xyz);
    const float a = attenuate(1, 0, 1, d);

    float cos_surf = max(dot(normalize(gs_out.normal), dir), 0.0f);

    color += cos_surf * a * point_lights[i].color * point_lights[i].intensity;
  }

  // Multiply intensity with diffuse/specular
  vec3 emissivity_term = emission;
  color = (diffuse * color) + emissivity_term;

  vec3 final_trans = vec3(1.0, 1.0, 1.0);
  float alpha = 1.0;
  if (illum == 4 || illum == 6 || illum == 7 || illum == 9)
  {
    final_trans = transmittance;
    alpha = dissolve;
  }

  vec4 final_color = clamp(vec4(final_trans * color, alpha), 0, 1);

  // Output to 3D texture
  ivec3 dim = imageSize(tex3D[0]);
  ivec3 voxel_pos = ivec3(dim * scale_and_bias(pos));

  for (int i = 0; i < 6; i++)
    imageAtomicRGBA8Avg(tex3D[i], voxel_pos, final_color);
}
