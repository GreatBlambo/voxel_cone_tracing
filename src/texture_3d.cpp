#include "texture_3d.h"

GLuint create_tex_3d(int width, int height, int depth, int levels)
{
  // Setup 3d texture
  GLuint tex;
  glGenTextures(1, &tex);
  glBindTexture(GL_TEXTURE_3D, tex);

  glTexParameteri(GL_TEXTURE_3D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_BORDER);
  glTexParameteri(GL_TEXTURE_3D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_BORDER);
  glTexParameteri(GL_TEXTURE_3D, GL_TEXTURE_WRAP_R, GL_CLAMP_TO_BORDER);

  glTexParameteri(GL_TEXTURE_3D, GL_TEXTURE_MIN_FILTER, GL_LINEAR_MIPMAP_LINEAR);
  glTexParameteri(GL_TEXTURE_3D, GL_TEXTURE_MAG_FILTER, GL_LINEAR_MIPMAP_LINEAR);

  glTexStorage3D(GL_TEXTURE_3D, levels, GL_RGBA8, width, height, depth);

  glTexImage3D(GL_TEXTURE_3D, 0, GL_R32UI, width, height, depth, 0, GL_RGBA, GL_FLOAT, NULL);

  glGenerateMipmap(GL_TEXTURE_3D);
  glBindTexture(GL_TEXTURE_3D, 0);

  return tex;
}

void destroy_tex_3d(GLuint tex)
{
  glDeleteTextures(1, &tex);
}

void activate_tex_3d(GLuint program, GLuint tex, GLuint unit)
{
  // Bind 3d texture
  glActiveTexture(GL_TEXTURE0 + unit);
  glBindTexture(GL_TEXTURE_3D, tex);
}

void clear_tex_3d(GLuint tex, GLfloat clear_color[4])
{
  glBindTexture(GL_TEXTURE_3D, tex);
  glClearTexImage(tex, 0, GL_RGBA, GL_FLOAT, clear_color);
  glBindTexture(GL_TEXTURE_3D, 0);
}

void mip_tex_3d(GLuint tex)
{
  glBindTexture(GL_TEXTURE_3D, tex);
  glGenerateMipmap(GL_TEXTURE_3D);  
  glBindTexture(GL_TEXTURE_3D, 0);
}
