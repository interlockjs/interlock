import * as path from "path";

import Joi from "joi";

const cwd = process.cwd();

export const interlockConstructorInput = Joi.object().keys({
  srcRoot: Joi.string()
    .required(),
  destRoot: Joi.string()
    .default(() => { return path.join(cwd, "dist"); }, "context + '/dist'"),
  entry: Joi.object().pattern(/.*/, Joi.alternatives().try(
    Joi.string(),
    Joi.object().keys({
      dest: Joi.string().required()
    })
  )),
  split: Joi.object().pattern(/.*/, Joi.alternatives().try(
    Joi.string(),
    Joi.object().keys({
      dest: Joi.string().required()
    })
  )),
  includeComments: Joi.boolean()
    .optional(),
  sourceMaps: Joi.boolean()
    .optional(),
  plugins: Joi.array()
    .optional(),
  implicitBundleDest: Joi.string()
    .default("[setHash].js")
    .optional(),
  extensions: Joi.array().items(Joi.string())
    .default([".js", ".jsx", ".es6"])
    .optional(),
  ns: Joi.string()
    .optional(),
  context: Joi.string()
    .default(cwd)
    .optional(),
  babelConfig: Joi.object()
    .optional()
}).or("entry", "split");
