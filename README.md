Image Customization Widget
==========

To add this widget to your Enketo Express installation see [this guidance](https://enketo.github.io/enketo-express/tutorial-34-custom-widgets.html).

Works on SVG media if the following is present for a question in XLSForm (or XForm):

1. Appearance `"image-customization"` on `select_one` and `select_multiple` questions.
2. The column `"body::kb:image-customization"` is present with a `${style}` reference for that question.
3. The settings sheet has a namespaces setting containing `kb="http://kobotoolbox.org/xforms"`.
4. The `${style}` calculation produces a stringified JSON format with SVG style instructions. The special `"selected"` property is optional and can be used to override the _selected_ style in the image-map widget (in case both are combined). The other properties correspond to an `id` attribute on a `<path>` in the SVG. Multiple style properties can be customized. See example:

```json
{
	"selected": {
		"stroke": "yellow",
		"stroke-width": 4
	},
	"AL": {
		"fill": "#ccc"
	},
	"CO": {
		"fill": "#ababab"
	}
}
```

Note that this widget is a custom hack for which we cannot device a proper sane XForm syntax. It is therefore not suitable for inclusion in the common Enketo tools and the ODK XForms specification.
