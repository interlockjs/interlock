# Extensibility

Bacon ipsum dolor amet jerky jowl meatloaf ribeye beef. Doner chicken bacon tongue picanha
landjaeger pork chop brisket leberkas fatback ball tip meatball corned beef. Drumstick turkey
salami fatback ham hock venison tenderloin pork chop short ribs t-bone beef ribs hamburger
shankle.

Chuck pastrami bresaola salami, pork flank porchetta ground round filet mignon tongue corned
beef. Pork belly spare ribs kielbasa chicken ribeye turducken, jerky pig doner flank.

Hamburger tail landjaeger ball tip, porchetta fatback drumstick kielbasa shankle frankfurter.

## bootstrapBundles

**Pluggable Type:** Stream<br />
**Locations in Source:** ([pluggable](../lib/compile/bundles/bootstrap.js#L25)) ([function](../lib/compile/bundles/bootstrap.js#L8))

## bootstrapCompilation

**Pluggable Type:** Sync<br />
**Locations in Source:** ([pluggable](../lib/compile/index.js#L14)) ([function](../lib/compile/index.js#L14))

## buildOutput

**Pluggable Type:** Promise<br />
**Locations in Source:** ([pluggable](../lib/compile/index.js#L65)) ([function](../lib/compile/index.js#L65))

## compile

**Pluggable Type:** Promise<br />
**Locations in Source:** ([pluggable](../lib/compile/index.js#L99)) ([function](../lib/compile/index.js#L99))

## compileModules

**Pluggable Type:** Stream<br />
**Locations in Source:** ([pluggable](../lib/compile/modules/compile.js#L65)) ([function](../lib/compile/modules/compile.js#L16))

## createModule

**Pluggable Type:** Sync<br />
**Locations in Source:** ([pluggable](../lib/compile/modules/resolve.js#L4)) ([function](../lib/compile/modules/resolve.js#L4))

## dedupeExplicit

**Pluggable Type:** Stream<br />
**Locations in Source:** ([pluggable](../lib/compile/bundles/dedupe-explicit.js#L41)) ([function](../lib/compile/bundles/dedupe-explicit.js#L5))

## dedupeImplicit

**Pluggable Type:** Stream<br />
**Locations in Source:** ([pluggable](../lib/compile/bundles/dedupe-implicit.js#L45)) ([function](../lib/compile/bundles/dedupe-implicit.js#L38))

## getBundles

**Pluggable Type:** Sync<br />
**Locations in Source:** ([pluggable](../lib/compile/index.js#L35)) ([function](../lib/compile/index.js#L35))

## getModuleMaps

**Pluggable Type:** Promise<br />
**Locations in Source:** ([pluggable](../lib/compile/index.js#L23)) ([function](../lib/compile/index.js#L23))

## getUrls

**Pluggable Type:** Promise<br />
**Locations in Source:** ([pluggable](../lib/compile/index.js#L58)) ([function](../lib/compile/index.js#L58))

## hashBundle
Calculate the bundle's hash.  Defers to [updateBundleHash](#updateBundleHash) for
the actual calculations.

**Pluggable Type:** Sync<br />
**Locations in Source:** ([pluggable](../lib/compile/bundles/hash.js#L40)) ([function](../lib/compile/bundles/hash.js#L27))

|     | Name | Type | Description |
| --- | ---- | ---- | ----------- |
| Parameter | **bundle** | Object | Bundle. |
| Return value |  | String | SHA1 that uniquely identifies the bundle. |


## hashModule

**Pluggable Type:** Sync<br />
**Locations in Source:** ([pluggable](../lib/compile/modules/hash.js#L30)) ([function](../lib/compile/modules/hash.js#L19))

## interpolateFilename

**Pluggable Type:** Sync<br />
**Locations in Source:** ([pluggable](../lib/compile/bundles/interpolate-filename.js#L14)) ([function](../lib/compile/bundles/interpolate-filename.js#L3))

## loadModule

**Pluggable Type:** Sync<br />
**Locations in Source:** ([pluggable](../lib/compile/modules/load-ast.js#L34)) ([function](../lib/compile/modules/load-ast.js#L28))

## parseModule

**Pluggable Type:** Sync<br />
**Locations in Source:** ([pluggable](../lib/compile/modules/load-ast.js#L11)) ([function](../lib/compile/modules/load-ast.js#L11))

## preresolve

**Pluggable Type:** Sync<br />
**Locations in Source:** ([pluggable](../lib/compile/modules/resolve.js#L18)) ([function](../lib/compile/modules/resolve.js#L18))

## resolveModule

**Pluggable Type:** Sync<br />
**Locations in Source:** ([pluggable](../lib/compile/modules/resolve.js#L42)) ([function](../lib/compile/modules/resolve.js#L22))

## updateBundleHash
Calculate the bundle's hash by invoking `update` with data from the bundle.
`update` should be called with string data only.

**Pluggable Type:** Sync<br />
**Locations in Source:** ([pluggable](../lib/compile/bundles/hash.js#L12)) ([function](../lib/compile/bundles/hash.js#L12))

|     | Name | Type | Description |
| --- | ---- | ---- | ----------- |
| Parameter | **update** | Function | Updates the ongoing computation of bundle hash. |
| Parameter | **bundle** | Object | The bundle object. |


## updateModuleHash

**Pluggable Type:** Sync<br />
**Locations in Source:** ([pluggable](../lib/compile/modules/hash.js#L5)) ([function](../lib/compile/modules/hash.js#L5))

