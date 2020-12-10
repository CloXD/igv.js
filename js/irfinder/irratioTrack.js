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

import IRFinderTrack from "./irfinderTrack.js";
import IGVGraphics from "../igv-canvas.js";
import { doAutoscale } from "../util/igvUtils.js";

const DEFAULT_POPOVER_WINDOW = 100000000;
// const type = "irfinder";

class IRratioTrack extends IRFinderTrack {

	constructor(config, browser) {
		super(config, browser);
		this.render = this.drawIntronRatio;
	}


	doAutoscale(featureList) {
		this.dataRange = {
			min: 0,
			max: 1,
			maxRatio : 1
		}
		if (featureList.length > 0) {
			const features = featureList.map((f)=>{return {value : f.IRratio} ;});
			const range = doAutoscale(features);
			this.dataRange.max = Math.max( range.max, 0.01);
			this.dataRange.maxRatio =this.dataRange.max; 
		}
		return this.dataRange
	}

	_paintAxis(ctx, pixelWidth, pixelHeight){
		IGVGraphics.fillRect(ctx, 0, 0, pixelWidth, pixelHeight, { 'fillStyle': "rgb(255, 255, 255)" });
		var font = {
			'font': 'normal 10px Arial',
			'textAlign': 'right',
			'strokeStyle': "black"
		};
		const n = Math.max((this.dataRange.max - this.dataRange.min) / 5, 0.01);
		
		pixelHeight = this.rowHeight - this.margin;
		
		for (let row = 0; row < this.maxRow; row++) {
			const yScale = (yValue) => {
					return this.margin + (row * (pixelHeight + this.margin)) + (((this.dataRange.max - yValue) / (this.dataRange.max - this.dataRange.min)) * pixelHeight)
				};
			let p = this.dataRange.min
			while (p <= this.dataRange.max +n && p <= 1) {
				
				const yp = yScale(p)
				IGVGraphics.strokeLine(ctx, 45, yp, 50, yp, font); // Offset dashes up by 2 pixel
				IGVGraphics.fillText(ctx, p, 44, yp + 4, font); // Offset numbers down by 2 pixels;
				p =Math.round((p+n)*100)/100

			}
			font['textAlign'] = 'center';
			IGVGraphics.fillText(ctx, "IRratio" , pixelWidth / 3, yScale(this.dataRange.max / 2), font, { rotate: { angle: -90 } });
			font['textAlign'] = 'right';
		}
	}

	drawIntronRatio(feature, bpStart, bpPerPixel, yScale, drawLabel, ctx){
		const fontStyle = {
				textAlign: 'center',
				fillStyle: "#000000",
				strokeStyle: "#000000"
			};
	    let start = Math.ceil((feature.start - bpStart + 15) / bpPerPixel) ,
 			end = Math.floor((feature.end - bpStart - 15) / bpPerPixel);
		
		let y0 = yScale(0), width, height, color = this.getFeatureColor(feature);

		width = end - start;
		height = yScale(feature.IRratio) - y0;
		IGVGraphics.strokeLine(ctx, start, y0, end, y0);
		IGVGraphics.fillRect(ctx, start, y0, width, height, { fillStyle: color });
		if (drawLabel) {
			IGVGraphics.fillText(ctx, Math.round(feature.IRratio*1000)/1000 , start + (width / 2), y0 + height - 5, fontStyle);
		}
	}

}



export default IRratioTrack

