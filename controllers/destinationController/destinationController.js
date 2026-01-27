import express from "express";
import * as Destination from '../../models/destinationModel/destinationModel.js'

//Create
export const addDestination = async (req, res) => {
    try {
        const { userType, destinationName } = req.body;
        const newDest = await Destination.createDestination({ userType, destinationName });
        res.status(201).json({ message: 'Destination created', destinationId: newDest.destinationId });
    } catch (err) {
        console.error('DESTINATION ERROR:', err); // 👈 MUST SEE THIS
        res.status(500).json({
        message: 'Server Error',
        error: err.message   // 👈 TEMPORARY (for debugging)
        });
    }
};

export const listDestinations = async (req, res) => {
    try {
        const destinations = await Destination.getAllDestinations();
        res.json(destinations);
    } catch (e) {
        console.error("Add Destination Error:", e);
        res.status(500).json({
            message: "Server Error."
        });
    }
};