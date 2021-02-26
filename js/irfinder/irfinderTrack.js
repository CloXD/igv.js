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

class IRFinderTrack extends TrackBase {

	constructor(config, browser) {
		super(config, browser);
		this.featureSource = FeatureSource(config, browser.genome);
		this.init(config)
		this.prev_request=""
	}
	
	init(config){
		this.height = config.height || 100;   // The preferred height
		this.margin = config.margin === undefined ? this.height < 100 ?  Math.round(this.height / 5) : 20 : config.margin;
		this.autoscale = config.autoscale || config.max === undefined;
		if (!this.autoscale) {
			this.dataRange = {
				min: config.min || 0,
				max: config.max === undefined ? 100 : config.max
			}
		}
		this.colorBy = config.colorBy === undefined ? "default" : config.colorBy;
		this.filters = {
			intronTypes: config.intronTypes === undefined ? ["clean"] : config.intronTypes,
			warnings: config.warnings === undefined ? ["-"] : config.warnings
		}
		this.popoverWindow = (config.popoverWindow === undefined ? DEFAULT_POPOVER_WINDOW : config.popoverWindow);
		this.description = config.description;  // might be null
		this.color = config.color === undefined ? "#80D6F8" : config.color;
		this.warningColors = config.warningColors === undefined ? ["#f71735", "#feb95f", "#b49a67", "#182825", "#80D6F8"] : config.warningColors;
		this.warnings = ["LowCover", "LowSplicing", "MinorIsoform", "NonUniformIntronCover", "-"]
		this.render=this.drawIntronDepth;
	}

	/**
	* Called when the track is removed.  Do any needed cleanup here
	*/
	dispose() {
		this.trackView = undefined;
	}


	async getFeatures(chr, start, end) {
		let request=""+chr+"-"+start+":"+end;
		if (  request != this.prev_request  ){
			this.features = await this.featureSource.getFeatures({ chr, start, end });
			this.prev_request = request	
		}
		
		return this.filter(this.features);
	}

	getFeatureColor(feature) {
		if (this.colorBy == "default") {
			return this.color;
		} else if (this.colorBy == "warnings") {
			return this.warningColors[this.warnings.findIndex((w) => { return w == feature.warning })];
		} else {
			let value;
			if ( this.colorBy.includes("scaled")){
				value= feature.IRratio / this.dataRange.maxRatio ;
			} else {
				value= feature.IRratio; 
			}
			
			
			if (value < 0.5 ){
				value = Math.ceil(value * 255 * 2) ;
				return "rgb("+value+",0,0)"; 
			} else {
				value = Math.ceil((value - 0.5) * 255 * 2);
				return  "rgb("+(255 - value)+",0,"+value+")";
			}
		} 
	}

	number2Text(number) {
		let txt = Math.floor(number);
		if (txt > 999) {
			txt = Math.floor(number / 1000) + "K"
		}
		return txt + ""
	}

	doAutoscale(featureList) {
		this.dataRange = {
			min: 0,
			max: 1, 
			maxRatio : 1
		}
		if (featureList.length > 0) {
			let range = doAutoscale(featureList);
			this.dataRange.max = range.max;
			const features = featureList.map((f)=>{return {value : f.IRratio} ;});
			range = doAutoscale(features);
			this.dataRange.maxRatio  = Math.max( range.max, 0.01);
		}
		return this.dataRange
	}

	draw(options) {
		const featureList = options.features;
		if (featureList) {
			const ctx = options.context;
			const bpPerPixel = options.bpPerPixel;
			const bpStart = options.bpStart;
			const pixelWidth = options.pixelWidth;
			let pixelHeight = (options.pixelHeight / this.maxRow) - this.margin;
			if (pixelHeight > this.rowHeight - this.margin) {
				pixelHeight = this.rowHeight - this.margin;
			}
			const bpEnd = bpStart + pixelWidth * bpPerPixel + 1;
			const drawLabel = bpPerPixel < 20 ? true : false;
			let feature;
			for (let idx = 0; idx < featureList.length; idx++) {
				feature = featureList[idx];
				if (feature.end < bpStart  || feature.start > bpEnd) {
					continue
				}

				const row = feature.row;
				const yScale = (yValue) => {
					return this.margin + (row * (pixelHeight + this.margin)) + (((this.dataRange.max - yValue) / (this.dataRange.max - this.dataRange.min)) * pixelHeight)
				};
				this.render(feature, bpStart, bpPerPixel, yScale, drawLabel, ctx);

				feature.y = { end: yScale(0) - this.margin, start: yScale(this.dataRange.max) - this.margin, row: row };

			}
		}
	}

	paintAxis(ctx, pixelWidth, pixelHeight) {
		if ( this.lastPaintAxis && this.lastPaintAxis == this.dataRange.max ){
			return;
		}
		this.lastPaintAxis = this.dataRange.max;
		this._paintAxis(ctx, pixelWidth, pixelHeight);
	}
	_paintAxis(ctx, pixelWidth, pixelHeight){
		IGVGraphics.fillRect(ctx, 0, 0, pixelWidth, pixelHeight, { 'fillStyle': "rgb(255, 255, 255)" });
		var font = {
			'font': 'normal 10px Arial',
			'textAlign': 'right',
			'strokeStyle': "black"
		};
		const n = Math.ceil((this.dataRange.max - this.dataRange.min) * 10 / this.rowHeight);
		pixelHeight = this.rowHeight - this.margin;
		
		for (let row = 0; row < this.maxRow; row++) {
			const yScale = (yValue) => {
					return this.margin + (row * (pixelHeight + this.margin)) + (((this.dataRange.max - yValue) / (this.dataRange.max - this.dataRange.min)) * pixelHeight)
				};
			let p = this.dataRange.min
			while (p < this.dataRange.max + n) {
				const yp = yScale(p)
				IGVGraphics.strokeLine(ctx, 45, yp, 50, yp, font); // Offset dashes up by 2 pixel
				IGVGraphics.fillText(ctx, this.number2Text(p), 44, yp + 4, font); // Offset numbers down by 2 pixels;
				p += n

			}
			font['textAlign'] = 'center';
			IGVGraphics.fillText(ctx, "Coverage" , pixelWidth / 3, yScale(this.dataRange.max / 2), font, { rotate: { angle: -90 } });
			font['textAlign'] = 'right';
		}
	}

	popupData(clickState) {
		let data = [];
		const track = clickState.viewport.trackView.track;
		const features = clickState.viewport.getCachedFeatures();
		const y = clickState.y - this.margin;
		const x = clickState.genomicLocation;
		if (features) {
			let feat = features.find((f) => { return f.y && x > f.start && x < f.end && y > f.y.start && y < f.y.end });
			if (feat) {
				return feat.popupData();
			}
		}

		return data;
	}
	
	
	filter(features){
		let rows = [-100], idx;
		this.maxSplice = 1;
		for (const feat of features) {
			if (this.filters.warnings.includes(feat.warning) && this.filters.intronTypes.includes(feat.intronType)) {
				if (feat.splice[2] > this.maxSplice) {
					this.maxSplice = feat.splice[2];
				}
				idx = rows.findIndex((r) => { return r < feat.start });
				if (idx == -1) {
					idx = rows.length;
					rows.push(feat.end);
				} else {
					rows[idx] = feat.end;
				}
				feat.row = idx;
			} else {
				feat.row = -1;
			};
		}
		this.maxRow = rows.length;
		this.rowHeight = this.height - this.margin > this.margin ? this.height - this.margin : 80;
		if (this.rowHeight > 80) this.rowHeight = 80;
		return features.filter((f)=>{return f.row != -1;})
	}


	computePixelHeight(features) {
		
		const height = ((this.maxRow) * (this.rowHeight + this.margin));
		this.pixelHeight= height;
		return height;
	};

	drawIntronDepth(feature, bpStart, bpPerPixel, yScale, drawLabel, ctx){
		const fontStyle = {
				textAlign: 'center',
				fillStyle: "#000000",
				strokeStyle: "#000000"
			};
		let coord = {
			flankL: {
				end: Math.ceil((feature.start - bpStart + 15) / bpPerPixel),
				start: Math.floor((feature.start - bpStart) / bpPerPixel),
				height: feature.exons[0]
			},
			flankR: {
				start: Math.floor((feature.end - bpStart - 15) / bpPerPixel),
				end: Math.ceil((feature.end - bpStart) / bpPerPixel),
				height: feature.exons[1]
			}
		};
		let y0 = yScale(0), x, y,  txt, txtm, width, height, color = this.getFeatureColor(feature);
		for (let att of ["flankL", "flankR"]) {
			x = coord[att].start;
			width = coord[att].end - coord[att].start;
			height = yScale(coord[att].height) - y0;
			IGVGraphics.fillRect(ctx, x, y0, width, height, { fillStyle: color , strokeStyle : "black"});
			if (drawLabel) {
				IGVGraphics.fillText(ctx, Math.ceil(att == "flankL" ? feature.exons[0] : feature.exons[1]), x + (width / 2), y0 + height - 5, fontStyle);
			}
		}
		IGVGraphics.strokeLine(ctx, coord.flankL.start, y0, coord.flankR.end, y0);
		let h1= yScale(feature.flankDepth[0]), h2 = yScale(feature.intronDepth), h3 = yScale(feature.flankDepth[1]);
		x= coord.flankL.end;
		width = (coord.flankR.start - coord.flankL.end) / 5;
		IGVGraphics.fillPolygon(ctx, [x,x,x+width,x+width, x+(width*4), x+(width*4), x+(width*5), x+(width*5)   ] , [y0, h1, h1, h2, h2 , h3, h3 , y0] , { fillStyle: color, strokeStyle : "black" });
		if (drawLabel) {
			IGVGraphics.fillText(ctx, Math.ceil(feature.intronDepth), coord.flankL.end + ((coord.flankR.start - coord.flankL.end) / 2), y0 + 10, fontStyle);
		}
		// splice exact

		let topY = yScale(coord.flankL.height), otherPt, splice = feature.splice[2];
		if (splice > 0) {
			ctx.beginPath();
			ctx.save();
			ctx.moveTo(coord.flankL.end, topY);
			let topY2 = yScale(coord.flankR.height) 
			ctx.bezierCurveTo(coord.flankL.end, topY - 10 , coord.flankR.start, topY2 -10, coord.flankR.start, topY2);
			ctx.lineWidth = Math.round((splice + 1) / this.maxSplice) * 2;
			ctx.strokeStyle = 'blue';
			ctx.stroke();
			ctx.closePath();
			ctx.restore();
			if (drawLabel) {
				x = coord.flankL.end + ((coord.flankR.start - coord.flankL.end) / 2);
				y = (topY2 + topY)/2
				txt = Math.ceil(splice);
				txtm =  ctx.measureText(txt).width
				IGVGraphics.fillRect(ctx, x - (txtm/2), y - 10, txtm, 15, { fillStyle: "white" });
				IGVGraphics.fillText(ctx, txt, x, y, fontStyle);
			}
		}
		splice = feature.splice[0] - feature.splice[2];
		if (splice > 0) {
			// splice Left
			ctx.beginPath();
			topY = yScale(coord.flankL.height);
			ctx.save();
			ctx.setLineDash([2, 2]);
			otherPt = coord.flankL.end + Math.ceil(25 / bpPerPixel );
			ctx.moveTo(coord.flankL.end, topY);
			topY= topY - 10
			ctx.bezierCurveTo(coord.flankL.end, topY , otherPt, topY, otherPt, topY);
			ctx.lineWidth = Math.round((splice + 1) / this.maxSplice) * 5;
			ctx.strokeStyle = 'green';
			ctx.stroke();
			ctx.closePath();
			ctx.restore();
			if (drawLabel) {
				x = otherPt;
				y = topY
				txt = Math.ceil(splice);
				txtm =  ctx.measureText(txt).width
				IGVGraphics.fillRect(ctx, x , y - 10, txtm, 15, { fillStyle: "white" });
				IGVGraphics.fillText(ctx, txt, x, y , {
					textAlign: 'left',
					fillStyle: "#000000",
					strokeStyle: "#000000"
				});
			}
		}
		splice = feature.splice[1] - feature.splice[2];
		if (splice > 0) {
			// splice Right
			ctx.beginPath();
			topY = yScale(coord.flankR.height);
			ctx.save();
			otherPt = coord.flankR.start - Math.ceil(25 / bpPerPixel );
			ctx.setLineDash([2, 2]);
			ctx.moveTo(coord.flankR.start, topY);
			topY = topY - 10; 
			ctx.bezierCurveTo(coord.flankR.start, topY , otherPt, topY, otherPt, topY );
			ctx.lineWidth = Math.round((splice + 1) / this.maxSplice) * 2;
			ctx.strokeStyle = 'red';
			ctx.stroke();
			ctx.closePath();
			ctx.restore();
			if (drawLabel) {
				x = otherPt;
				y = topY
				txt =  Math.ceil(splice);
				txtm =  ctx.measureText(txt).width
				IGVGraphics.fillRect(ctx, x - txtm , y - 10, txtm, 15, { fillStyle: "white" });
				IGVGraphics.fillText(ctx,txt, x, y , {
					textAlign: 'right',
					fillStyle: "#000000",
					strokeStyle: "#000000"
				});
			}
		}
	}
	
	forceUpdate(){
		this.trackView.viewports[0].tile.features= this.filter(this.features);
		this.trackView.viewports[0].cachedFeatures =this.trackView.viewports[0].tile.features; 
		this.trackView.checkContentHeight();
		this.trackView.updateViews(true);
	}

	menuItemList() {
		const self = this;
		const menuItems = [];
		menuItems.push({ object: $('<div class="igv-track-menu-border-top">') });
		(["default", "warnings", "IRratio" , "scaled IRratio"]).forEach(function(colorScheme) {
			menuItems.push({
				object: createCheckbox('Color by ' + colorScheme, colorScheme === self.colorBy),
				click: function() {
					self.colorBy = colorScheme;
					self.trackView.repaintViews();
				}
			});
		});
		menuItems.push({ object: $('<div class="igv-track-menu-border-top">') });
		menuItems.push({
			object: createCheckbox("Autoscale", self.autoscale),
			click: () => {
				self.autoscale = !self.autoscale;
				self.forceUpdate();
			}
		}
		)
		menuItems.push({ object: $('<div class="igv-track-menu-border-top">') });
		menuItems.push({ object: $('<strong>Warnings</strong>') });
		this.warnings.forEach(function(warn) {
			menuItems.push({
				object: createCheckbox(warn, self.filters.warnings.includes(warn)),
				click: function() {
					let idx = self.filters.warnings.findIndex((w) => { return w == warn });
					if (idx == -1) {
						self.filters.warnings.push(warn);
					} else {
						self.filters.warnings.splice(idx, 1);
					}
					self.forceUpdate();
				}
			});
		});
		menuItems.push({ object: $('<div class="igv-track-menu-border-top">') });
		menuItems.push({ object: $('<strong>Intron types</strong>') });
		["clean", "known-exon","known-exon+anti-near", "known-exon+anti-near+anti-over" , "known-exon+anti-over", "anti-near", "anti-over"].forEach(function(typ) {
			menuItems.push({
				object: createCheckbox(typ, self.filters.intronTypes.includes(typ)),
				click: function() {
					let idx = self.filters.intronTypes.findIndex((t) => { return t == typ });
					if (idx == -1) {
						self.filters.intronTypes.push(typ);
					} else {
						self.filters.intronTypes.splice(idx, 1);
					}
					self.forceUpdate();
				}
			});
		})

		return menuItems;
	}

}



export default IRFinderTrack

