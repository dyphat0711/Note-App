<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Folder\StoreFolderRequest;
use App\Http\Requests\Folder\UpdateFolderRequest;
use App\Http\Resources\FolderResource;
use App\Models\Folder;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FolderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $folders = $user->folders()
            ->withCount('notes')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => FolderResource::collection($folders),
        ]);
    }

    public function store(StoreFolderRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $folder = $user->folders()->create([
            'name' => $request->input('name'),
        ]);

        return response()->json([
            'message' => 'Folder created successfully',
            'data' => new FolderResource($folder),
        ], 201);
    }

    public function update(UpdateFolderRequest $request, Folder $folder): JsonResponse
    {
        $this->authorize('update', $folder);

        $folder->update([
            'name' => $request->input('name'),
        ]);

        return response()->json([
            'message' => 'Folder updated successfully',
            'data' => new FolderResource($folder),
        ]);
    }

    public function destroy(Folder $folder): JsonResponse
    {
        $this->authorize('delete', $folder);

        $folder->notes()->update(['folder_id' => null]);
        $folder->delete();

        return response()->json([
            'message' => 'Folder deleted successfully',
        ]);
    }
}
