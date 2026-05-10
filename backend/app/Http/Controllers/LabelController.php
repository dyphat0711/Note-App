<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Label\StoreLabelRequest;
use App\Http\Requests\Label\UpdateLabelRequest;
use App\Http\Resources\LabelResource;
use App\Models\Label;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LabelController extends Controller
{
    /**
     * Display a listing of the user's labels with note counts.
     */
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $labels = $user->labels()
            ->withCount('notes')
            ->get();

        return LabelResource::collection($labels)->response();
    }

    /**
     * Store a newly created label.
     */
    public function store(StoreLabelRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $data = ['name' => $request->input('name')];
        if ($request->has('color')) {
            $data['color'] = $request->input('color');
        }
        $label = $user->labels()->create($data);

        return response()->json([
            'message' => 'Label created successfully',
            'data' => new LabelResource($label),
        ], 201);
    }

    /**
     * Update the specified label.
     */
    public function update(UpdateLabelRequest $request, Label $label): JsonResponse
    {
        $this->authorize('update', $label);

        $data = ['name' => $request->input('name')];
        if ($request->has('color')) {
            $data['color'] = $request->input('color');
        }
        $label->update($data);

        return response()->json([
            'message' => 'Label updated successfully',
            'data' => new LabelResource($label),
        ]);
    }

    /**
     * Remove the specified label.
     * Cascade deletes the pivot records in note_label.
     */
    public function destroy(Label $label): JsonResponse
    {
        $this->authorize('delete', $label);

        DB::transaction(function () use ($label): void {
            // Detach all notes from this label (pivot records)
            $label->notes()->detach();

            $label->delete();
        });

        return response()->json([
            'message' => 'Label deleted successfully',
        ]);
    }
}
