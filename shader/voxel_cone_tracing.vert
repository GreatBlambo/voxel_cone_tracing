#version 450 core

layout (location = 0) in vec3 position;
layout (location = 1) in vec3 normal;
layout (location = 2) in vec2 uv;

layout (binding = 0) uniform camera
{
  mat4 projection;
  mat4 view;
};

out VS_OUT 
{
  vec4 world_position;
  vec3 normal;
  vec2 uv;
} vs_out;

uniform mat4 model;

void main()
{
  vs_out.world_position = model * vec4(position, 1.0);
  gl_Position = projection * view * vs_out.world_position;
  vs_out.normal = normalize(mat3(transpose(inverse(model))) * normal);
  vs_out.uv = uv;
}
