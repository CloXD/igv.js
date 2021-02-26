/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Broad Institute
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import FeatureSource from '../feature/featureSource.js';
import TrackBase from "../trackBase.js";
import IGVGraphics from "../igv-canvas.js";
import { createCheckbox } from "../igv-icons.js";
import $ from "../vendor/jquery-3.3.1.slim.js";
import { doAutoscale, extend } from "../util/igvUtils.js";

const DEFAULT_POPOVER_WINDOW = 100000000;
// const type = "irfinder";

class iMOKATrack extends TrackBase {

	constructor(config, browser) {
		super(config, browser);
		this.init(config)
	}

	init(config) {
		this.featureType = 'object';
		this.groups = config.groups;
		this.predictors = config.predictors;
		this.type = "kmerSequences";
		this.onClick = config.onClick;
		this.request_type = config.request_type;
		this.featureSource = config.source;
		this.rows = [];
		this.colors = {
			minus: "rgb(239,62,54)", plus: "rgb(79,117,155 )",
			mismatch: "rgb(38,165,38)", insertion: "rgb(38,165,38)",
			deletion: "rgb(240,128,60)", splice: "rgb(15,180,110)"
		};
		let self = this;
		this.featureSource.getInfo().then((response) => {
			self.infos = response;
		});
		this.request;
		if ( this.request_type == "kmers"){
			this.dimensions = {
			barHeight: 20,
			minLetter: 0.10
			};	
		}else {
			this.dimensions = {
			barHeight: 5,
			minLetter: 0.10
			};
		}
		
		this.max_y = 1;
		this.features;
		this.colorBy = "accuracy"
	}

	/**
	* Called when the track is removed.  Do any needed cleanup here
	*/
	dispose() {
		this.trackView = undefined;
		this.features = undefined;
	}


	async getFeatures(chr, start, end) {
		return this.featureSource.getFeatures(chr, start, end, this.request_type);
	}

	getFeatureColor(feature) {
		if (this.colorBy == "default") {
			return this.color;
		} else if (this.colorBy == "warnings") {
			return this.warningColors[this.warnings.findIndex((w) => { return w == feature.warning })];
		} else {
			let value;
			if (this.colorBy.includes("scaled")) {
				value = feature.IRratio / this.dataRange.maxRatio;
			} else {
				value = feature.IRratio;
			}


			if (value < 0.5) {
				value = Math.ceil(value * 255 * 2);
				return "rgb(" + value + ",0,0)";
			} else {
				value = Math.ceil((value - 0.5) * 255 * 2);
				return "rgb(" + (255 - value) + ",0," + alue  + ")";
			}
		}
	}


	popupData(clickState) {
		let y = clickState.y, self = this, good;
		let x = clickState.genomicLocation;
		let r = Math.floor(y / (self.dimensions.barHeight))

		for (let i = 0; i < this.features.length; i++) {
			good = false;
			let feat = this.features[i];
			if (feat.y == r && feat.start <= x && feat.end >= x) {
				console.log(feat);
				this.onClick(feat);
				return null;
			}

		}
		return null;
	}

	draw(options) {
		var self = this, ctx = options.context;
		if (options.features != self.features) {
			self.initFeatures(options.features);
		}
		self.features.forEach((feat) => {
			if (feat.start) {
				renderAlignment(feat);
			}
		});
		function x(val) {
			return (val - options.bpStart) / options.bpPerPixel
		}

		function y(val) {
			return (val * self.dimensions.barHeight);
		}


		function renderAlignment(aln) {
			var bl, color, rev = (aln.strand == "-" ? true : false), h = self.dimensions.barHeight * 0.9, w, positions = [], cy = y(aln.y), drawLetter = (self.dimensions.minLetter > options.bpPerPixel ? true : false);
			if (self.colorBy == "strand") {
				color = rev ? self.colors.minus : self.colors.plus;
			} else if (self.colorBy == "accuracy") {
				let best_val = (aln.best_value == undefined ? 0 : (((aln.best_value - self.infos.threshold) * 255) / (100 - self.infos.threshold)));
				color = "rgb(" + best_val + ",0," + (255 - best_val) + ")";
			} else {
				color = "black";
			}

			for (let b = 0; b < aln.blocks.length; b++) {
				bl = aln.blocks[b];
				positions.push({ x1: x(bl.t_start), x2: x(bl.t_end) });
				let cpos = positions[b];
				IGVGraphics.fillRect(ctx, cpos.x1, cy, cpos.x2 - cpos.x1, h, { fillStyle: color });
				if (b != 0) {
					w = cpos.x1 - positions[b - 1].x2;
					if (w > 1) {
						IGVGraphics.fillRect(ctx, positions[b - 1].x2, cy + (h * 0.45), w, h * 0.1, { fillStyle: color });
					}
				}
			};
			if (positions.length > 0) {
				let hstep = 30, curr = 0, lcolor, ay = h * 0.1;
				for (let step_x = positions[0].x1 + ay; step_x < positions[positions.length - 1].x2; step_x += hstep) {
					if (step_x > positions[curr].x2 && curr < positions.length - 1) {
						curr++;
					}
					lcolor = (step_x > positions[curr].x1 && step_x < positions[curr].x2) ? "white" : color;
					IGVGraphics.strokeLine(ctx, step_x + (rev ? ay : -ay), cy + (h / 2) - ay, step_x, cy + (h / 2), { strokeStyle: lcolor });
					IGVGraphics.strokeLine(ctx, step_x + (rev ? ay : -ay), cy + (h / 2) + ay, step_x, cy + (h / 2), { strokeStyle: lcolor });
				}
			}
			aln.signatures.forEach((sig) => {
				let pos = { x1: x(sig.position.start), x2: x(sig.position.end) };
				if (sig.signature_type == "mutation") {
					IGVGraphics.fillRect(ctx, pos.x1, cy, pos.x2 - pos.x1 < 0.5 ? 0.5 : pos.x2 - pos.x1, h, { fillStyle: self.colors.mismatch })
					if (drawLetter) IGVGraphics.fillText(ctx, sig.info, pos.x1, cy + (h * 0.8), { fillStyle: "black", font: '14px sans-serif' });
				} else if (sig.signature_type == "insertion") {
					ctx.save();
					ctx.lineWidth = 3;
					ctx.moveTo(pos.x1, cy);
					ctx.lineTo((pos.x1 + pos.x2) / 2, cy + h);
					ctx.lineTo(pos.x2, cy);
					ctx.closePath();
					ctx.fillStyle = self.colors.insertion;
					ctx.fill();
					ctx.restore();
					if (drawLetter) IGVGraphics.fillText(ctx, sig.info, pos.x1, cy + (h * 0.8), { fillStyle: "black", font: (h*0.5)+'px sans-serif' });
				} else if (sig.signature_type == "deletion") {
					IGVGraphics.fillRect(ctx, pos.x1, cy, pos.x2 - pos.x1 < 0.5 ? 0.5 : pos.x2 - pos.x1, h, { fillStyle: self.colors.deletion })
					if (drawLetter) IGVGraphics.fillText(ctx, sig.info, pos.x1, cy + (h * 0.8), { fillStyle: "black", font: (h*0.5)+'px sans-serif' });
				} else if (sig.signature_type == "splice") {
					let midPoint = (pos.x2 + pos.x1) / 2;
					IGVGraphics.strokeLine(ctx, pos.x1, cy + (h / 2), midPoint, cy, { strokeStyle: self.colors.splice });
					IGVGraphics.strokeLine(ctx, midPoint, cy, pos.x2, cy + (h / 2), { strokeStyle: self.colors.splice });
				}
			});
		}
	}


	contains(a, b) {
		return (a.start >= b.start && a.start <= b.end) || (a.start >= b.start && a.start <= b.end);
	}
	initFeatures(features) {
		this.features = features;
		if (this.features.length == 0) return 0;
		this.features.sort((a, b) => {
			a.start == b.start ? b.end - a.end : a.start - b.start;
		});
		let max_y = 0, changed = true;
		for (let i = 0; i < this.features.length; i++) {
			let a = this.features[i];
			a.y = 1;
			changed = true;
			while (changed) {
				changed = false;
				for (let j = 0; j < this.features.length; j++) {
					if (i != j) {
						let b = this.features[j];
						if ((this.contains(a, b) || this.contains(b, a)) && (b.y != undefined && b.y == a.y)) {
							a.y++;
							changed = true;
						}
					}
				}
			}

			if (max_y < a.y) max_y = a.y;
		}

		this.max_y = max_y;
	}

	computePixelHeight(features) {
		if (features.length == 0) return (this.dimensions.barHeight);
		this.initFeatures(features);
		return (this.max_y + 1) * this.dimensions.barHeight;
	};



	forceUpdate() {
		this.trackView.viewports[0].tile.features = this.filter(this.features);
		this.trackView.viewports[0].cachedFeatures = this.trackView.viewports[0].tile.features;
		this.trackView.checkContentHeight();
		this.trackView.updateViews(true);
	}

	menuItemList() {
		var self = this, menuItems = [];
		menuItems.push({ object: $('<div class="igv-track-menu-border-top">') });
		(["strand", "accuracy"]).forEach(function(colorScheme) {
			menuItems.push({
				object: createCheckbox('Color by ' + colorScheme, colorScheme === self.colorBy),
				click: function() {
					self.colorBy = colorScheme;
					self.trackView.repaintViews();
				}
			});
		});

		return menuItems;
	}

}



export default iMOKATrack

